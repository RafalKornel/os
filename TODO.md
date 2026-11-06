# TODO

Working list of migrations Archy still owes itself. Keep items concrete and
checkable.

## 1. Migrate off the Omarchy repository

Archy is a fork of omarchy, but it still leans on omarchy's third-party pacman
repository. See [`install/archy-missing-packages.md`](install/archy-missing-packages.md)
for the package-by-package detail.

Why this has to happen:

- A pure official-Arch install currently fails. `default/pacman/pacman-stable.conf`
  adds a `[omarchy]` repo (`https://pkgs.omarchy.org/stable/$arch`), and
  `default/pacman/mirrorlist-stable` points at `stable-mirror.omarchy.org`.
- `install/preflight/pacman.sh` installs `omarchy-keyring` and locally signs key
  `40DFB630FF42BCFFB047046CF0134EE680CAC571`. Without the omarchy repo this step
  is dead weight, or breaks.
- `[omarchy]` is configured `SigLevel = Optional TrustAll`, so its packages are
  not verified against our keyring and we control neither their contents nor
  their availability. This is the largest trust and reproducibility gap.
- It is the last hard tie to omarchy. Until it is gone, Archy is not
  self-contained and can be broken by an upstream repo change.

Tasks:

- [ ] Decide the target: pure official `core`/`extra`/`multilib` + AUR (via a
      bootstrapped AUR helper), optionally plus a repo we control. Record the
      decision here.
- [ ] Remove `[omarchy]` from `default/pacman/pacman-stable.conf`.
- [ ] Point `default/pacman/mirrorlist-stable` at official Arch mirrors (no
      `omarchy.org`).
- [ ] Drop the `omarchy-keyring` install and the key recv/lsign lines from
      `install/preflight/pacman.sh`.
- [ ] Resolve every package in `install/archy-missing-packages.md` to AUR,
      Flatpak, or drop, and record the choice next to each row.
- [ ] Bootstrap an AUR helper without omarchy (see "Installing yay differently"
      in that doc) so `install/packaging/yay.sh` keeps working.
- [ ] Regenerate and re-check the missing list to confirm it is empty:
      `comm -23 <(grep -vE '^[[:space:]]*#|^[[:space:]]*$' install/archy-base.packages | sort -u) <(pacman -Slq core extra multilib | sort -u)`
- [ ] Rename the remaining `omarchy` references (e.g. `omarchy-keyring`) so
      nothing in the install path assumes omarchy.

## 2. Migrate the Hyprland config to Lua (Hyprland 0.57+)

Hyprland 0.55 introduced an optional Lua config; 0.57 (2026-10-28) dropped
hyprlang `.conf` support outright — "starting with this version, .conf configs
are no longer supported". Archy still ships only `.conf`, so on 0.57 the desktop
will not load its config.

How the switch works:

- Hyprland checks for `hyprland.lua` at startup. If present, it is loaded
  instead of `hyprland.conf`. The check happens once, at startup.
- The Lua API is `hl.*`: for example `hl.dispatch(...)`,
  `hl.get_active_workspace()`, `hl.reload_config()`, plus events, timers,
  callbacks, and layout data.
- Other Hypr* tools (hyprlock, hypridle, hyprsunset, hyprpicker) keep using
  hyprlang, so only the compositor config moves.

Scope in Archy:

- `config/hypr/*.conf` and `config/hypr/bindings.conf`
- `default/hypr/*.conf`, `default/hypr/bindings/*.conf`, `default/hypr/apps/*`
- `default/themed/hyprland.conf.tpl`, rendered into
  `~/.config/archy/current/theme/hyprland.conf` by `archy-theme-set-templates`
- The `source =` chain in `config/hypr/hyprland.conf`, including the generated
  theme file, has to be re-expressed as Lua imports/requires.

Tasks:

- [ ] Read the 0.57 release notes and the wiki Lua pages ("Lua code snippets",
      "Lua API", config options) to pin the exact API.
- [ ] Produce a `hyprland.lua` equivalent of the current `hyprland.conf` source
      chain.
- [ ] Convert settings blocks: `general`, `decoration`, `input`, `misc`,
      `cursor`, `group`, `dwindle`, `master`, `animations`, `binds`, `xwayland`,
      `ecosystem`.
- [ ] Convert `bind`/`bindd`/`bindm`/`bindel`/`bindl`/`bindr` and `unbind` to
      the Lua bind syntax.
- [ ] Convert `windowrule` entries (0.53 `match:` syntax) to the Lua rules API.
- [ ] Convert `exec-once` autostart lines.
- [ ] Re-express `source =` and `$variables` (e.g. `$terminal`, `$browser`,
      `$activeBorderColor`) using Lua.
- [ ] Update `default/themed/hyprland.conf.tpl` so theming emits Lua (or a
      theme `.lua` include).
- [ ] Verify with `hyprctl reload` / `hl.reload_config()` on a 0.57 build.
- [ ] Update docs and commands that reference `hyprland.conf`
      (`archy-refresh-hyprland`, `archy-refresh-config`, keybinding cheat
      sheets).

## 3. Upgrade opencode to v2 and port its config + plugins

Archy ships opencode v1 config and a v1 plugin. `install/archy-base.packages:81`
installs the `opencode` package (currently 1.18.29, CLI 1.19.x). V2 is a breaking
release with exactly three intentional breaks: a new plugin API, new server
API/clients, and the terminal client config moving from layered `tui.json(c)`
files to one global `cli.json`. V1 plugin implementations do **not** run on the
V2 plugin API, so `config/opencode/plugins/web-search.ts` will silently stop
loading. V1 config is normalized in memory, but converting to the native V2
shape is recommended.

What is affected in Archy:

- `install/archy-base.packages` — the `opencode` entry is a v1 package; V2 is
  `@opencode/cli` on npm or `opencode-beta` on the AUR. Pick the install path
  that fits Section 1 (no omarchy repo).
- `config/opencode/opencode.json` — v1 keys: `plugin` (singular),
  `autoupdate`, `permission` (grouped by tool), `provider` (singular). All have
  native V2 equivalents.
- `config/opencode/tui.json` — v1 layered client config. V2 uses a single
  `~/.config/opencode/cli.json` (`$schema` `https://opencode.ai/v2/cli.json`);
  the first V2 startup migrates global `tui.json` but leaves the V1 file behind.
- `config/opencode/plugins/web-search.ts` — v1 plugin using `ctx.$` and the
  `tool()` helper. V2 must be ported to the new plugin API; a rename is not
  enough. V2 also requires configured local plugin paths to be *directories*
  (single-file paths are skipped), so it becomes `plugins/web-search/index.ts`.
- `config/opencode/package.json` / `bun.lock` — both pin v1 plugin SDKs and
  disagree (`package.json` 1.14.20, `bun.lock` 1.2.10); V2 needs a v2
  `@opencode-ai/plugin`/plugin SDK. `node_modules/` is vendored here too.
- `bin/archy-restart-opencode` — signals `killall -SIGUSR2 opencode`. V2 splits
  server and terminal client; the reload path is `opencode service restart`.
- `bin/archy-theme-set:58` calls `archy-restart-opencode`, so theme switching
  depends on the reload path still working.
- `bin/archy-remove-preinstalls` — checks/removes `~/.local/bin/opencode`; the
  V2 installer may replace that path or the package install.

Config field mapping to apply (V1 → native V2):

- `plugin` → `plugins` (array; package+options tuple becomes
  `{ "package": ..., "options": ... }`).
- `autoupdate: false` → `update: "disable"` (`"notify"`/`"auto"` otherwise).
- `permission.bash: "deny"` → `permissions: [{ "action": "shell", "resource": "*", "effect": "deny" }]`.
  `bash` is now `shell`, `task` is `subagent`, `write`/`patch` are `edit`.
- `permission.external_directory: "deny"` — note V2 allows external paths by
  default; keep the deny (or `ask`) explicitly as a `permissions` rule.
- `provider` → `providers`; `npm` → `package` with an `aisdk:` prefix
  (`@ai-sdk/openai-compatible` → `aisdk:@ai-sdk/openai-compatible`); provider
  `options` split into `settings`/`headers`/`body`, with `baseURL` under
  `settings`. The `llama.cpp` and `ollama` local providers must be re-checked.
- Top-level `theme` in `opencode.json` is client-side; V2 puts theme under
  `cli.json` (`theme.name` / `theme.mode`), so the `tui.json` theme moves there.

Tasks:

- [ ] Decide the V2 install path (npm `@opencode/cli` vs AUR `opencode-beta`)
      and remove the v1 `opencode` entry from `install/archy-base.packages`.
- [ ] Read `/v2/docs/migrate-v1/` and the plugin migration guide
      (`/build/plugins/migrate-v1`) to pin the exact V2 plugin API.
- [ ] Port `config/opencode/plugins/web-search.ts` to the V2 plugin API and move
      it to `config/opencode/plugins/web-search/index.ts`.
- [ ] Decide whether `config/opencode/.legacy/web-crawl.ts` and
      `.legacy/web-search.ts` are ported or deleted (they are not loaded today).
- [ ] Convert `config/opencode/opencode.json` to native V2: rename
      `plugin`→`plugins`, `autoupdate`→`update`, `permission`→`permissions`,
      `provider`→`providers`, and fix the local provider `package`/`settings`.
- [ ] Migrate `config/opencode/tui.json` to a global
      `config/opencode/cli.json` (theme, keybinds, appearance) and delete the
      v1 `tui.json`.
- [ ] Refresh the bundled `package.json`/`bun.lock` to the v2 plugin SDK and
      re-vendor `node_modules`, resolving the 1.14.20 vs 1.2.10 mismatch.
- [ ] Update `bin/archy-restart-opencode` to the V2 reload path
      (`opencode service restart`) and confirm `archy-theme-set` still works.
- [ ] Re-check `bin/archy-remove-preinstalls` and the v1 `opencode.json.bak.*`
      / `tui-migration.bak` artifacts; drop or migrate them.
- [ ] Verify with a V2 install: models, the two local providers, permissions
      (`shell`/`external_directory`), the ported `web_search` tool, and theme
      switching.
