RUNZSH=no CHSH=no KEEP_ZSHRC=yes \
  sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

mkdir -p "$HOME/.zsh"

rm -rf "$HOME/.zsh/typewritten"
git clone https://github.com/reobin/typewritten.git "$HOME/.zsh/typewritten"

cp ~/.local/share/archy/config/zsh/alias.zsh ~/.zsh/alias.zsh
cp ~/.local/share/archy/config/zsh/.zshrc ~/.zshrc

ZSH_BIN="$(command -v zsh)"
grep -qxF "$ZSH_BIN" /etc/shells || echo "$ZSH_BIN" | sudo tee -a /etc/shells >/dev/null
sudo chsh -s "$ZSH_BIN" "$USER"
