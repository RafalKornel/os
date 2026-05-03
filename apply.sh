#!/bin/bash

sudo cp keyd.conf /etc/keyd/default.conf

cp -R hypr ~/.config/
cp -R nvim ~/.config/

cp -R waybar ~/.config/

cp -R zsh ~/.zsh
echo "source ~/.zsh/alias.zsh" >> ~/.zshrc

sudo cp arch-logo.png /usr/share/plymouth/themes/omarchy/logo.png
