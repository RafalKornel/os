cat /etc/keyd/laptop | sudo tee /etc/keyd/default.conf > /dev/null 
cat ~/.config/hypr/monitors-laptop | tee ~/.config/hypr/monitors.conf > /dev/null
cat ~/.config/waybar/config-laptop | tee ~/.config/waybar/config.jsonc > /dev/null
sudo systemctl restart keyd
hyprctl reload
killall -SIGUSR2 waybar
