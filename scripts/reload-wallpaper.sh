#!/usr/bin/env bash

WALLPAPER_DIR="$HOME/wallpapers/"

echo $WALLPAPER_DIR
CURRENT_WALL=$(hyprctl hyprpaper listloaded)
echo $CURRENT_WALL
WALLPAPER=$(find "$WALLPAPER_DIR" -type f ! -name "$(basename "$CURRENT_WALL")" | shuf -n 1)
echo $WALLPAPER
hyprctl hyprpaper preload "$WALLPAPER"
hyprctl hyprpaper wallpaper "HDMI-A-2,$WALLPAPER"
