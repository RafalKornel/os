#!/bin/bash

set -eEo pipefail

SOURCE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

export ARCHY_PATH="${ARCHY_PATH:-$HOME/.local/share/archy}"
export ARCHY_INSTALL="$ARCHY_PATH/install"
export ARCHY_INSTALL_LOG_FILE="/var/log/archy-install.log"
export PATH="$ARCHY_PATH/bin:$PATH"

export OMARCHY_MIRROR=stable
echo 'Server = https://stable-mirror.omarchy.org/$repo/os/$arch' | sudo tee /etc/pacman.d/mirrorlist >/dev/null

# Sync into place only when we're not already there
if [[ $SOURCE_DIR != $ARCHY_PATH ]]; then
  rm -rf "$ARCHY_PATH"
  mkdir -p "$ARCHY_PATH"
  cp -a "$SOURCE_DIR/." "$ARCHY_PATH/"
fi

# Install
source "$ARCHY_INSTALL/helpers/all.sh"
source "$ARCHY_INSTALL/preflight/all.sh"
source "$ARCHY_INSTALL/packaging/all.sh"
source "$ARCHY_INSTALL/config/all.sh"
source "$ARCHY_INSTALL/login/all.sh"
source "$ARCHY_INSTALL/post-install/all.sh"
