# https://wiki.archlinux.org/title/Systemd-resolved
if systemctl is-enabled --quiet systemd-resolved.service; then
  echo "Symlink resolved stub-resolv to /etc/resolv.conf"
  sudo ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
fi
