# Terminal setup

## 1. Terminal itself

kitty with config specified in kitty.conf

```
cp dotfiles/kitty.conf ~/.config/kitty/kitty.conf
```

## 2. zhs
install zsh

```
sudo pacman -Sy zsh
```

copy zshrc:
```
cp dotfiles/.zshrc ~/.zshrc
```

## 3. Oh my zsh
Theme: typewritten
https://typewritten.dev/#/

```
git clone https://github.com/reobin/typewritten.git $ZSH_CUSTOM/themes/typewritten
```

then in .zshrc:
```
ZSH_THEME="typewritten/typewritten"

## 4. Kitty theme
theme: seuol256.conf (modified)

https://github.com/ubmit/seoul256-kitty

```
cp dotfiles/seoul256.conf ~/.config/kitty
echo "include seoul256.conf" >> ~/.config/kitty/kitty.conf
```

## 5. Fonts 

use JetBrains Mono Nerd

```
yay -Sy ttf-jetbrains-mono-nerd
```


