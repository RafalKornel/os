# Archy

Arch-based Linux desktop config (Hyprland, Waybar, Walker, etc.), forked from old
omarchy. Pure bash + config files, no build step. `install.sh` copies the whole
repo to `$ARCHY_PATH` (default `~/.local/share/archy`) and prepends
`$ARCHY_PATH/bin` to `PATH`; nothing runs from a dev checkout unless you add its
`bin/` to `PATH` yourself.

# Layout

- `bin/archy-*` — every user command (all on `PATH`); `bin/archy` is the dispatcher/command center
- `install/` — install phases, sourced in order by `install.sh` (`helpers` → `preflight` → `packaging` → `config` → `login` → `post-install`)
- `config/` — defaults copied to `~/.config/`
- `default/themed/*.tpl` — theme templates with `{{ variable }}` placeholders
- `themes/*/` — bundled themes (each has `colors.toml`, `neovim.lua`, `vscode.json`, `icons.theme`, wallpapers)
- `test/archy-cli-test.sh` — the CLI test suite
- `install/archy-base.packages` lists base packages
- User state lives outside the repo: `~/.config/archy/` (themes, hooks), `~/.local/state/archy/` (toggles, migration state)

# Testing / Verification

- `test/archy-cli-test.sh` — bash; needs `jq` and `python3`. It prepends `bin/` to `PATH` itself, so run it directly.
- `archy commands --check` — validate command metadata and route collisions. Run this after touching any `bin/archy-*` file.
- `archy commands --json` — machine-readable command inventory (test asserts >=200 entries, all with summaries).
- `archy dev benchmark [--repeat=<n>]` — CLI response-time benchmark.

# Command Metadata (critical)

`bin/archy` builds its whole command tree at runtime by scanning the top comment
block of each executable `bin/archy-*`. Only the first comment block is read
(first 80 lines, stops at the first non-blank non-comment line), so metadata must
sit there, before any code.

- Required in every `bin/archy-*`: `# archy:summary=<one line>`. Missing it fails
  `archy commands --check` and the test suite.
- Only set fields that override defaults; the test rejects redundant fields.
  - Inferred: `group` = first filename segment after `archy-`, `name` = rest with
    dashes → spaces, `route` = `archy <group> <name>`, `binary` = filename,
    `requires-sudo` = false.
  - Optional: `# archy:group=`, `# archy:name=` (may be empty for root commands),
    `# archy:args=`, `# archy:examples=` (pipe-separated), `# archy:aliases=`
    (pipe-separated alternate routes).
  - Do **not** set `binary`, `usage`, empty `args`, or `requires-sudo=false`.
- See `archy-dev-bin-metadata --help` for the full reference.
- `name`/`group` overrides are how the CLI route differs from the filename
  (e.g. `archy-pkg-add` → route `archy install package`, filename route
  `archy pkg add`).
- `archy` dispatches by exec'ing the resolved binary; `--help` on any route prints
  metadata instead of executing the command.

# Command Naming

All commands start with `archy-`. Prefixes indicate purpose:

- `cmd-` check if commands exist, misc utility commands
- `capture-` screenshots, screen recordings, capture tools
- `pkg-` package management helpers
- `hw-` hardware detection (return exit codes for use in conditionals)
- `refresh-` copy a default config to the user's `~/.config/`
- `restart-` restart a component
- `launch-` open applications
- `install-` install optional software
- `setup-` interactive setup wizards
- `toggle-` toggle features on/off
- `theme-` theme management
- `update-` update components

# Helper Commands

Use these instead of raw shell commands:

- `archy-cmd-missing` / `archy-cmd-present` — check for commands
- `archy-pkg-missing` / `archy-pkg-present` — check for packages
- `archy-pkg-add` — install packages (handles pacman and AUR)
- `archy-hw-asus-rog` — detect ASUS ROG hardware (and similar `hw-*` commands)

# Refresh Pattern

```bash
archy-refresh-config hypr/hyprlock.conf
```

Copies `~/.local/share/archy/config/<path>` to `~/.config/<path>`. If the
destination exists it is backed up to `<path>.bak.<unix-ts>` first; identical
files skip the backup.

# Migrations

Create with `archy-dev-add-migration --no-edit` (or without the flag to edit in
nvim). Migrations land in `~/.local/share/archy/migrations/`, named after the unix
timestamp of the last commit, and must be run from the installed path (they read
`$ARCHY_PATH`).

`archy-migrate` runs pending migrations and records completion in
`~/.local/state/archy/migrations/` (skipped ones in `.../migrations/skipped/`).

Format:

- No shebang
- Start with an `echo` describing what the migration does
- Reference the archy dir via `$ARCHY_PATH`

Example:

```bash
echo "Disable fingerprint in hyprlock if fingerprint auth is not configured"

if archy-cmd-missing fprintd-list || ! fprintd-list "$USER" 2>/dev/null | grep -q "finger"; then
  sed -i 's/fingerprint:enabled = .*/fingerprint:enabled = false/' ~/.config/hypr/hyprlock.conf
fi
```

# Themes

- Applied by `archy-theme-set <name>` (name is lowercased, spaces → dashes).
  Bundled `themes/` first, then user `~/.config/archy/themes/<name>/` overlaid.
- Templates in `default/themed/*.tpl` (and user `~/.config/archy/themed/*.tpl`,
  which win) are rendered by `archy-theme-set-templates` using
  `{{ key }}` / `{{ key_strip }}` / `{{ key_rgb }}` from `colors.toml`.
- Apply is atomic: everything is generated into `current/next-theme`, then swapped
  into `current/theme`, and components are restarted.

# Style

- Two spaces indentation, no tabs; LF, UTF-8, final newline (see `.editorconfig`)
- bash 5 conditionals: `[[ ]]` for strings/files, `(( ))` for numbers
- In `[[ ]]` don't quote variables, but do quote string literals
  (`[[ $branch == "dev" ]]`); prefer `(( count < 50 ))` over `[[ $count -lt 50 ]]`
- Quote paths with spaces instead of escaping: `"$APP_DIR/Disk Usage.desktop"`
- Shebangs must be `#!/bin/bash` (never `#!/usr/bin/env bash`)
