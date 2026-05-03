#!/bin/bash

sudo cp keyd.conf /etc/keyd/default.conf

cp -R hypr ~/.config/hypr/
cp -R nvim ~/.config/nvim/

cp -R zsh ~/.zsh
echo "source ~/.zsh/alias.zsh" >> ~/.zshrc
