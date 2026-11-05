# Bring up the installed system's networking.
# Archy uses systemd-networkd for links and systemd-resolved for DNS
# (see bin/archy-setup-dns and install/config/docker.sh), but neither was
# ever enabled, leaving a dead resolv.conf stub on fresh installs.

# Provide a wired DHCP profile if the system has none yet
if ! compgen -G "/etc/systemd/network/*.network" >/dev/null 2>&1; then
  sudo mkdir -p /etc/systemd/network
  sudo cp "$ARCHY_PATH/default/systemd/network/20-archy.network" /etc/systemd/network/
fi

# Enable the network stack
chrootable_systemctl_enable systemd-networkd.service
chrootable_systemctl_enable systemd-resolved.service

# Point resolv.conf at the resolved stub now that resolved is enabled
sudo ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
