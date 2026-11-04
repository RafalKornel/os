# Install archy SDDM theme
archy-refresh-sddm

# Setup SDDM login service
sudo mkdir -p /usr/local/share/wayland-sessions
sudo cp "$ARCHY_PATH/default/wayland-sessions/archy.desktop" /usr/local/share/wayland-sessions/archy.desktop

sudo mkdir -p /etc/sddm.conf.d
if [[ ! -f /etc/sddm.conf.d/autologin.conf ]]; then
  cat <<EOF | sudo tee /etc/sddm.conf.d/autologin.conf
[Autologin]
User=$USER
Session=archy

[Theme]
Current=archy
EOF
else
  sudo sed -i 's/^Session=hyprland-uwsm$/Session=archy/' /etc/sddm.conf.d/autologin.conf
fi

# Prevent password-based SDDM logins from creating an encrypted login keyring
# (which conflicts with the passwordless Default_keyring used for auto-unlock)
sudo sed -i '/-auth.*pam_gnome_keyring\.so/d' /etc/pam.d/sddm
sudo sed -i '/-password.*pam_gnome_keyring\.so/d' /etc/pam.d/sddm

# Don't use chrootable here as --now will cause issues for manual installs
sudo systemctl enable sddm.service
