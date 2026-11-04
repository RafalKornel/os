# Overwrite parts of the archy-menu with user-specific submenus.
# See $ARCHY_PATH/bin/archy-menu for functions that can be overwritten.
#
# WARNING: Overwritten functions will obviously not be updated when Archy changes.
#
# Example of minimal system menu:
#
# show_system_menu() {
#   case $(menu "System" "  Lock\n󰐥  Shutdown") in
#   *Lock*) archy-system-lock ;;
#   *Shutdown*) archy-system-shutdown ;;
#   *) back_to show_main_menu ;;
#   esac
# }
#
# Example of overriding just the about menu action: (Using zsh instead of bash (default))
#
# show_about() {
#   exec archy-launch-or-focus-tui "zsh -c 'fastfetch; read -k 1'"
# }
