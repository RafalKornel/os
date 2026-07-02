#!/bin/bash

sudo cp keyd/default.conf /etc/keyd/default.conf

cp -R hypr ~/.config/
cp -R nvim ~/.config/

cp -R waybar ~/.config/

cp -R zsh ~/.zsh
cp zsh/.zshrc ~/.zshrc

sudo cp arch-logo.png /usr/share/plymouth/themes/omarchy/logo.png

chsh -s $(which zsh)
