#!/usr/bin/env bash
# Copyright 2026 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software distributed under
# the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
# OF ANY KIND, either express or implied. See the License for the specific language
# governing permissions and limitations under the License.

# Self-test: the harness passes on identical data, fails when a recipe color changes, and fails
# loudly from the wrong directory. Needs a CLI: CLI=<path> (default: the cached BASE CLI of
# origin/main, built once by base-cli.sh). Runs button and badge, sampled; about a minute.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI="${CLI:-$("$HERE/base-cli.sh" ensure)/bin/design-data}"
[ -x "$CLI" ] || { echo "selftest: no CLI at $CLI" >&2; exit 1; }

w="$(mktemp -d)"; trap 'rm -rf "$w"' EXIT
mkdir -p "$w/a/packages" "$w/b/packages"
# a repo-root layout is <root>/packages/design-data; node_modules is not data
tar -C "$(git rev-parse --show-toplevel)/packages" --exclude node_modules -cf - design-data | tar -C "$w/a/packages" -xf -
cp -R "$w/a/packages/design-data" "$w/b/packages/design-data"

rc() { node "$HERE/render-compare.mjs" --base-root "$w/a" --pr-root "$w/b" --base-cli "$CLI" --pr-cli "$CLI" \
  --components button,badge --sample 4 --png-sample 3 "$@"; }
expect() { # expect <exit> <label> <command...>
  local want="$1" label="$2"; shift 2
  local code=0; "$@" >"$w/out.txt" 2>&1 || code=$?
  [ "$code" = "$want" ] || { cat "$w/out.txt" >&2; echo "FAIL: $label (exit $code, wanted $want)" >&2; exit 1; }
  echo "ok: $label"
}

expect 0 "identical data passes" rc

# a recipe color change: the badge background becomes a literal red in the PR tree
jq '.parts.container.props.fill = [{"value":"#ff0000"}]' "$w/b/packages/design-data/visuals/badge.json" >"$w/badge.json"
mv "$w/badge.json" "$w/b/packages/design-data/visuals/badge.json"
expect 1 "a changed recipe color fails" rc
grep -q "render-compare: FAIL" "$w/out.txt" || { echo "FAIL: no FAIL line" >&2; exit 1; }

# wrong directory: the package dir is not a repo root, so the harness refuses (exit 2)
expect 2 "the wrong directory fails loudly" node "$HERE/render-compare.mjs" --base-root "$w/a/packages/design-data" \
  --pr-root "$w/b/packages/design-data" --base-cli "$CLI" --pr-cli "$CLI" --components button
grep -q "not a repo-root layout" "$w/out.txt" || { echo "FAIL: wrong-directory message missing" >&2; exit 1; }

# a layout with no relationships: refused, not rendered vacuously
rm -rf "$w/b/packages/design-data/relationships"
expect 2 "missing relationships fail loudly" rc
echo "render-compare selftest: OK"
