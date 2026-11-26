# Copyright 2026 Adobe. All rights reserved.
# Sourced by gate.sh and selftest.sh.

# scenes_match A B: true when the scenes are equal after blanking token labels (normalize.jq).
# On a difference prints a short diff of the normalised JSON and returns 1.
scenes_match() {
  local dir; dir="$(dirname "${BASH_SOURCE[0]}")"
  local a b
  a="$(jq -S -f "$dir/normalize.jq" "$1")" || return 1
  b="$(jq -S -f "$dir/normalize.jq" "$2")" || return 1
  [ "$a" = "$b" ] && return 0
  diff <(printf '%s\n' "$b") <(printf '%s\n' "$a") | head -n 20 || true
  return 1
}
