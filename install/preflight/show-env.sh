# Show installation environment variables
gum log --level info "Installation Environment:"

env | grep -E "^(ARCHY_CHROOT_INSTALL|ARCHY_ONLINE_INSTALL|ARCHY_USER_NAME|ARCHY_USER_EMAIL|USER|HOME|ARCHY_REPO|ARCHY_REF|ARCHY_PATH)=" | sort | while IFS= read -r var; do
  gum log --level info "  $var"
done
