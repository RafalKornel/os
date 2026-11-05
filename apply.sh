#!/bin/bash

# Apply just the Archy config layer without running the full installer:
# sync this repo into ARCHY_PATH, then run install/config/all.sh.

set -eEo pipefail

SOURCE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

export ARCHY_PATH="${ARCHY_PATH:-$HOME/.local/share/archy}"
export ARCHY_INSTALL="$ARCHY_PATH/install"
export ARCHY_INSTALL_LOG_FILE="$HOME/.local/state/archy/apply-config.log"
export PATH="$ARCHY_PATH/bin:$PATH"

# Preserve the identity used by xcompose.sh if the caller didn't supply one
export ARCHY_USER_NAME="${ARCHY_USER_NAME:-$(git config --global user.name 2>/dev/null || true)}"
export ARCHY_USER_EMAIL="${ARCHY_USER_EMAIL:-$(git config --global user.email 2>/dev/null || true)}"

# Sync the repo into ARCHY_PATH only when we're not already there
if [[ $SOURCE_DIR != $ARCHY_PATH ]]; then
  rm -rf "$ARCHY_PATH"
  mkdir -p "$ARCHY_PATH"
  cp -a "$SOURCE_DIR/." "$ARCHY_PATH/"
fi

mkdir -p "$(dirname "$ARCHY_INSTALL_LOG_FILE")"

source "$ARCHY_INSTALL/helpers/chroot.sh"
source "$ARCHY_INSTALL/helpers/logging.sh"

source "$ARCHY_INSTALL/config/all.sh"
