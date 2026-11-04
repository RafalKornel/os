#!/bin/bash

set -euo pipefail

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
CLI="$ROOT/bin/archy"
TMPDIR=""

export PATH="$ROOT/bin:$PATH"

pass() {
  printf 'ok - %s\n' "$1"
}

fail() {
  printf 'not ok - %s\n' "$1" >&2
  exit 1
}

assert_output_contains() {
  local description="$1"
  local output="$2"
  local expected="$3"

  if [[ $output != *"$expected"* ]]; then
    printf 'Expected output to contain: %s\n' "$expected" >&2
    printf 'Actual output:\n%s\n' "$output" >&2
    fail "$description"
  fi

  pass "$description"
}

cleanup() {
  [[ -n $TMPDIR && -d $TMPDIR ]] && rm -rf "$TMPDIR"
}
trap cleanup EXIT

output=$("$CLI" --help)
assert_output_contains "main help renders" "$output" "Archy command center"
assert_output_contains "main help includes hardware group" "$output" "hw"
assert_output_contains "main help includes package group" "$output" "pkg"
if grep -Eq '^  [a-z0-9-]+[[:space:]].*\([0-9]+\)$' <<<"$output"; then
  fail "main help does not show group counts"
fi
pass "main help does not show group counts"

output=$("$CLI" commands)
assert_output_contains "commands lists documented commands" "$output" "archy theme set <theme-name>"

"$CLI" commands --json | jq -e '.ok == true and (.commands | length >= 200)' >/dev/null
pass "commands --json is valid JSON with full bin coverage"

"$CLI" commands --json | jq -e 'all(.commands[]; .summary != "undocumented")' >/dev/null
pass "all included commands have summaries"

"$CLI" commands --json | jq -e 'all(.commands[]; has("binary") and has("filename_route") and has("routes") and (has("legacy") | not) and (has("usage") | not) and (has("visibility") | not) and (has("mutates") | not) and (has("interactive") | not))' >/dev/null
pass "JSON uses binary/routes and omits legacy/usage/extra metadata"

"$CLI" commands --check >/dev/null
pass "commands --check passes"

"$CLI" commands --all >/dev/null
pass "commands --all does not crash"

"$CLI" commands --all --json | jq -e '.commands[] | select(.route == "archy hyprland window gaps toggle" and .summary != "undocumented")' >/dev/null
pass "fallback commands are inferred and documented"

"$CLI" commands --all --json | jq -e '.commands[] | select(.route == "archy dev benchmark")' >/dev/null
pass "benchmark command is discoverable in all commands"

"$CLI" commands --json | jq -e '.commands[] | select(.binary == "archy-pkg-add" and .route == "archy install package" and .filename_route == "archy pkg add" and (.routes | index("archy pkg add")))' >/dev/null
pass "JSON exposes canonical and filename-derived routes"

"$CLI" commands --json | jq -e '.commands[] | select(.binary == "archy-refresh-pacman" and .requires_sudo == true)' >/dev/null
pass "sudo metadata marks sudo commands"

output=$("$CLI" theme --help)
assert_output_contains "group help renders" "$output" "Theme commands"

output=$("$CLI" install --help)
assert_output_contains "install group help renders" "$output" "archy install package <packages...>"

output=$("$CLI" install)
assert_output_contains "bare group renders help instead of picker" "$output" "Install commands"
assert_output_contains "bare group includes package route" "$output" "archy install package <packages...>"

output=$("$CLI" toggle)
assert_output_contains "bare root command with children renders help" "$output" "Toggle commands"
assert_output_contains "bare toggle help includes child route" "$output" "archy toggle waybar"

output=$("$CLI" pkg --help)
assert_output_contains "package group includes pkg add fallback route" "$output" "archy pkg add <packages...>"

output=$("$CLI" restart --help)
assert_output_contains "restart group includes inferred commands" "$output" "archy restart btop"
assert_output_contains "restart group includes all restart commands" "$output" "archy restart wifi"

output=$("$CLI" hw --help)
assert_output_contains "hardware group help renders" "$output" "archy hw asus rog"
assert_output_contains "hardware group includes touchpad" "$output" "archy hw touchpad"

output=$("$CLI" menu --help)
assert_output_contains "menu group includes share fallback route" "$output" "archy menu share"

output=$("$CLI" share)
assert_output_contains "bare required-arg alias renders CLI help" "$output" "Usage:"
assert_output_contains "bare share help uses canonical route" "$output" "archy share <clipboard|file|folder> [path...]"

output=$("$CLI" menu share)
assert_output_contains "bare required-arg filename route renders CLI help" "$output" "archy share <clipboard|file|folder> [path...]"

output=$("$CLI" branch set)
assert_output_contains "bare required-choice route renders CLI help" "$output" "archy branch set <master|rc|dev>"

CLI="$CLI" python3 <<'PY'
import json
import os
import subprocess
import sys

cli = os.environ['CLI']
commands = json.loads(subprocess.check_output([cli, 'commands', '--json'], text=True))['commands']
by_group = {}
for command in commands:
  binary = command['binary']
  stem = binary.removeprefix('archy-')
  group = stem.split('-', 1)[0]
  filename_route = 'archy ' + stem.replace('-', ' ')
  by_group.setdefault(group, []).append((binary, filename_route, command['route']))

missing = []
for group, rows in sorted(by_group.items()):
  proc = subprocess.run([cli, group, '--help'], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
  output = proc.stdout + proc.stderr
  if proc.returncode != 0:
    missing.append((group, '<group-help-failed>', f'exit {proc.returncode}'))
    continue
  for binary, filename_route, canonical_route in rows:
    if filename_route not in output and canonical_route not in output and binary not in output:
      missing.append((group, binary, filename_route))

if missing:
  for row in missing:
    print('\t'.join(row), file=sys.stderr)
  sys.exit(1)
PY
pass "every filename-derived group help represents its bins"

output=$(timeout 5 "$CLI" theme set --help)
assert_output_contains "command help renders without executing" "$output" "Binary:"
assert_output_contains "theme set help names binary" "$output" "archy-theme-set"

output=$(timeout 5 "$CLI" update --help)
assert_output_contains "mutating command help does not execute target" "$output" "archy-update"
assert_output_contains "root command help shows related child commands" "$output" "archy update perform"

output=$("$CLI" screenshot --help)
assert_output_contains "root alias resolves to command help" "$output" "archy-capture-screenshot"

"$CLI" commands --json | jq -e '.commands[] | select(.binary == "archy-capture-screenshot") | .aliases | index("archy screenshot")' >/dev/null
pass "aliases are included in JSON metadata"

output=$("$CLI" pkg add --help)
assert_output_contains "fallback route resolves to curated metadata" "$output" "archy-pkg-add"
assert_output_contains "fallback route shows canonical route" "$output" "archy install package <packages...>"

output=$("$CLI" system reboot --help)
assert_output_contains "system command help is safe" "$output" "archy-system-reboot"

output=$("$CLI" dev benchmark --repeat=1)
assert_output_contains "benchmark command runs" "$output" "Archy CLI benchmark"

"$CLI" theme list >/dev/null
pass "safe dispatch works for theme list"

"$CLI" theme current >/dev/null
pass "safe dispatch works for theme current"

"$CLI" font list >/dev/null
pass "safe dispatch works for font list"

"$CLI" font current >/dev/null
pass "safe dispatch works for font current"

for binary in \
  archy-update \
  archy-theme-set \
  archy-capture-screenshot \
  archy-system-reboot \
  archy-pkg-add; do
  [[ -x $ROOT/bin/$binary ]] || fail "binary is executable: $binary"
  pass "binary is executable: $binary"
done

while IFS= read -r binary_path; do
  header=$(awk '
    NR == 1 && /^#!/ { next }
    /^[[:space:]]*$/ { if (seen) print; next }
    /^[[:space:]]*#/ { seen=1; print; next }
    { exit }
  ' "$binary_path")

  grep -q '^# archy:summary=' <<<"$header" || fail "metadata summary is present: $binary_path"
  ! grep -q '^# archy:binary=' <<<"$header" || fail "metadata does not repeat inferred binary: $binary_path"
  ! grep -q '^# archy:args=$' <<<"$header" || fail "metadata does not include empty args: $binary_path"
  ! grep -Eq '^# archy:(legacy|usage|visibility|mutates|interactive)=' <<<"$header" || fail "metadata avoids removed fields: $binary_path"
  ! grep -Eq '^# archy:requires-sudo=false$' <<<"$header" || fail "metadata omits false booleans: $binary_path"
done < <(find "$ROOT/bin" -maxdepth 1 -type f -executable -name 'archy-*' | sort)
pass "all executable bins have slim self-documenting metadata"

TMPDIR=$(mktemp -d)
ln -s "$CLI" "$TMPDIR/archy"

{
  printf '#!/bin/bash\n\n'
  printf '# ordinary comments are fine\n'
  printf '# archy:this malformed line should be ignored\n'
  printf '# archy:group=weird\n'
  printf '# archy:name=test\n'
  printf '# archy:summary=Survives malformed metadata comments\n'
  printf '# archy:made-up=value\n'
  printf 'echo weird-ok\n'
} >"$TMPDIR/archy-weird-test"
chmod +x "$TMPDIR/archy-weird-test"

{
  printf '#!/bin/bash\n\n'
  printf '# a partial metadata header should not destroy fallback routing\n'
  printf '# archy:summary=Partial metadata keeps inferred route\n'
  printf '# archy:made-up=value\n'
  printf 'echo partial-ok\n'
} >"$TMPDIR/archy-partial-meta-test"
chmod +x "$TMPDIR/archy-partial-meta-test"

{
  printf '#!/bin/bash\n\n'
  printf 'echo body-metadata-ok\n'
  printf '# archy:group=wrong\n'
  printf '# archy:name=wrong\n'
} >"$TMPDIR/archy-body-metadata-test"
chmod +x "$TMPDIR/archy-body-metadata-test"

"$TMPDIR/archy" commands --all --json | jq -e '.commands[] | select(.route == "archy weird test" and .summary == "Survives malformed metadata comments")' >/dev/null
pass "unknown metadata values are non-fatal"

"$TMPDIR/archy" commands --all --json | jq -e '.commands[] | select(.route == "archy partial meta test" and .summary == "Partial metadata keeps inferred route")' >/dev/null
pass "partial metadata keeps inferred fallback route"

"$TMPDIR/archy" commands --all --json | jq -e '.commands[] | select(.route == "archy body metadata test" and .summary == "Run the body metadata test command")' >/dev/null
pass "metadata-looking comments after script body are ignored"

output=$("$TMPDIR/archy" weird test)
assert_output_contains "temporary metadata command dispatches" "$output" "weird-ok"

output=$("$TMPDIR/archy" partial meta test)
assert_output_contains "partial metadata command dispatches" "$output" "partial-ok"

output=$("$TMPDIR/archy" body metadata test)
assert_output_contains "body metadata command dispatches by filename" "$output" "body-metadata-ok"
