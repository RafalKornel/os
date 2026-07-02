cat /etc/keyd/desktop | sudo tee /etc/keyd/default.conf > /dev/null 
cat ~/.config/hypr/monitors-desktop | tee ~/.config/hypr/monitors.conf > /dev/null
cat ~/.config/waybar/config-desktop | tee ~/.config/waybar/config.jsonc > /dev/null
sudo systemctl restart keyd
hyprctl reload
killall -SIGUSR2 waybar
