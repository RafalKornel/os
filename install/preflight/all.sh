source $ARCHY_INSTALL/preflight/guard.sh
source $ARCHY_INSTALL/preflight/begin.sh
run_logged $ARCHY_INSTALL/preflight/show-env.sh
run_logged $ARCHY_INSTALL/preflight/pacman.sh
run_logged $ARCHY_INSTALL/preflight/first-run-mode.sh
run_logged $ARCHY_INSTALL/preflight/disable-mkinitcpio.sh
