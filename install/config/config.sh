# Copy over Archy configs
mkdir -p ~/.config
cp -R ~/.local/share/archy/config/* ~/.config/

# Use default bashrc from Archy
cp ~/.local/share/archy/default/bashrc ~/.bashrc
