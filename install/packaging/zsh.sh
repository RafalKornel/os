sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

mkdir -p "$HOME/.zsh"
git clone https://github.com/reobin/typewritten.git "$HOME/.zsh/typewritten"

cp -R ~/.local/share/archy/config/zsh ~/.zsh
cp ~/.local/share/archy/config/zsh/.zshrc ~/.zshrc

chsh -s $(which zsh)
