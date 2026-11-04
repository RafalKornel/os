# Install build tools
archy-pkg-add base-devel

# Configure pacman
sudo cp -f ~/.local/share/archy/default/pacman/pacman-${ARCHY_MIRROR:-stable}.conf /etc/pacman.conf
sudo cp -f ~/.local/share/archy/default/pacman/mirrorlist-${ARCHY_MIRROR:-stable} /etc/pacman.d/mirrorlist

sudo pacman-key --recv-keys 40DFB630FF42BCFFB047046CF0134EE680CAC571 --keyserver keys.openpgp.org
sudo pacman-key --lsign-key 40DFB630FF42BCFFB047046CF0134EE680CAC571

sudo pacman -Sy
archy-pkg-add archy-keyring

# Refresh all repos
sudo pacman -Syyuu --noconfirm
