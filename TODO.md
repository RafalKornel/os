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
