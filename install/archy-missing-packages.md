# Packages to replace — not in official Arch repos

These entries in [`archy-base.packages`](archy-base.packages) are **not** available
from Arch's official `core`/`extra`/`multilib` repositories. They are served by
Omarchy's `[omarchy]` repo (`https://pkgs.omarchy.org/...`) and/or the AUR, which
is why a pure-official `/etc/pacman.conf` fails with `error: target not found`.

Nothing below has a drop-in *official* Arch package. For each one the real choice
is: (a) pull it from the `[omarchy]` repo, (b) build it from the AUR, (c) install
it as a Flatpak, or (d) drop it.

Regenerate this list with:

```bash
comm -23 \
  <(grep -vE '^[[:space:]]*#|^[[:space:]]*$' install/archy-base.packages | sort -u) \
  <(pacman -Slq core extra multilib | sort -u)
```

## The list

| Package | Where it really comes from | Suggested action |
| --- | --- | --- |
| `hyprland-preview-share-picker` | AUR / `[omarchy]` | AUR `hyprland-preview-share-picker`; no official equivalent |
| `localsend` | AUR / `[omarchy]` | AUR `localsend` or Flatpak `org.localsend.localsend_app` |
| `spotify` | AUR / `[omarchy]` | AUR `spotify` or Flatpak `com.spotify.Client` |
| `tobi-try` | Omarchy-internal name for `try-cli` (AUR) | AUR `try-cli` |
| `ttf-ia-writer` | AUR | AUR `ttf-ia-writer`; or drop (just a font) |
| `typora` | AUR / `[omarchy]` | AUR `typora`; or drop |
| `tzupdate` | AUR | AUR `tzupdate`; no official equivalent (systemd timesyncd sets time, not zone) |
| `xdg-terminal-exec` | AUR | AUR `xdg-terminal-exec`; no official equivalent |
| `yaru-icon-theme` | AUR / `[omarchy]` | AUR `yaru-icon-theme`; official alternative: `adwaita-icon-theme` (already pulled in) |
| `yay` | AUR (AUR helper) | see "Installing yay" below |
| `omarchy-walker` / `archy-walker` | `[omarchy]` (`archy-walker` in `archy-packages.md`, not currently in `archy-base.packages`) | AUR `walker`; or keep from `[omarchy]` |

## Notes / false positives

- `nvim` shows up in a naive diff but is **not** missing: official Arch ships
  `neovim`, which `provides=nvim`, so `pacman -S nvim` resolves. Keep it.
- The failed run also listed `omarchy-walker`; it is not in the current
  `archy-base.packages` (it comes in from another list/step). It is still
  `[omarchy]`/AUR-only.

## Installing yay differently

There is no AUR helper in the official repos, so `yay` can never come from
`core`/`extra`/`multilib`. Options:

1. **Bootstrap from the AUR** (classic, but must run as the normal user — `makepkg`
   refuses root, and `run_logged` pipes stdin from `/dev/null`, so make it
   non-interactive):

   ```bash
   sudo pacman -S --needed --noconfirm git base-devel
   rm -rf yay
   git clone https://aur.archlinux.org/yay.git
   cd yay && makepkg -si --noconfirm
   ```

2. **Drop the from-source build** and let the `[omarchy]` repo provide `yay`
   (it ships there), by keeping the `[omarchy]` server in `/etc/pacman.conf`.

3. **Any helper is AUR-only.** `paru`, `yay`, etc. all require a bootstrap or a
   third-party repo; there is no officially packaged AUR helper.
