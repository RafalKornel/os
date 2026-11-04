if archy-battery-present; then
  cat <<EOF | sudo tee "/etc/udev/rules.d/99-wifi-powersave.rules"
SUBSYSTEM=="power_supply", ATTR{type}=="Mains", ATTR{online}=="0", RUN+="/usr/bin/systemd-run --no-block --collect --unit=archy-wifi-powersave-on $HOME/.local/share/archy/bin/archy-wifi-powersave on"
SUBSYSTEM=="power_supply", ATTR{type}=="Mains", ATTR{online}=="1", RUN+="/usr/bin/systemd-run --no-block --collect --unit=archy-wifi-powersave-off $HOME/.local/share/archy/bin/archy-wifi-powersave off"
EOF

  sudo udevadm control --reload
  sudo udevadm trigger --subsystem-match=power_supply
fi
