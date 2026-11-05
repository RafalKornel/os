mapfile -t packages < <(grep -v '^#' "$ARCHY_INSTALL/archy-aur.packages" | grep -v '^$')
archy-pkg-aur-add "${packages[@]}"
