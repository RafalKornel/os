# Set default XCompose that is triggered with CapsLock
tee ~/.XCompose >/dev/null <<EOF
# Run archy-restart-xcompose to apply changes

# Include fast emoji access
include "%H/.local/share/archy/default/xcompose"

# Identification
<Multi_key> <space> <n> : "$ARCHY_USER_NAME"
<Multi_key> <space> <e> : "$ARCHY_USER_EMAIL"
EOF
