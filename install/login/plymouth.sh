if [[ $(plymouth-set-default-theme) != "archy" ]]; then
  sudo cp -r "$HOME/.local/share/archy/default/plymouth" /usr/share/plymouth/themes/archy/
  sudo plymouth-set-default-theme archy
fi
