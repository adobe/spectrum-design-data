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

# Self-test: the matrix keeps option values and covers every option pair; the harness passes on
# identical data, fails when a recipe color changes or an option-conditional fill changes (disabled
# + outline, default settings), fails loudly from the wrong directory, exits 2 on a vacuous run; a new recipe with no BASE recipe is neutral (exit 0) while its neighbors are still compared, and a deleted recipe is not;
# a stale lock is taken over. Needs a CLI: CLI=<path> (default: the cached BASE CLI of
# origin/main, built once by base-cli.sh). A few minutes.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI="${CLI:-$("$HERE/base-cli.sh" ensure)/bin/design-data}"
[ -x "$CLI" ] || { echo "selftest: no CLI at $CLI" >&2; exit 1; }

w="$(mktemp -d)"; trap 'rm -rf "$w"' EXIT
mkdir -p "$w/a/packages" "$w/b/packages"
# a repo-root layout is <root>/packages/design-data; node_modules is not data
# the schema dir makes the CLI treat the tree as a repo; without it it silently uses its embedded dataset
tar -C "$(git rev-parse --show-toplevel)/packages" --exclude node_modules -cf - design-data design-data-spec/schemas | tar -C "$w/a/packages" -xf -
cp -R "$w/a/packages/design-data" "$w/a/packages/design-data-spec" "$w/b/packages/"

rc() { node "$HERE/render-compare.mjs" --base-root "$w/a" --pr-root "$w/b" --base-cli "$CLI" --pr-cli "$CLI" \
  --components button,badge --sample 4 --png-sample 3 "$@"; }
expect() { # expect <exit> <label> <command...>
  local want="$1" label="$2"; shift 2
  local code=0; "$@" >"$w/out.txt" 2>&1 || code=$?
  [ "$code" = "$want" ] || { cat "$w/out.txt" >&2; echo "FAIL: $label (exit $code, wanted $want)" >&2; exit 1; }
  echo "ok: $label"
}

# the matrix must keep option values (a dedupe bug once dropped every option case) and cover all pairs
data="$w/a/packages/design-data"
node --input-type=module -e "
import { matrixFor, readComponent, pairCoverage } from '$HERE/matrix.mjs';
for (const n of ['button', 'accordion']) {
  const { cases, params } = matrixFor(n, [readComponent('$data', n)]);
  const vals = new Set(cases.flatMap((c) => Object.entries(c.options).map(([k, v]) => k + '=' + JSON.stringify(v))));
  const pairs = pairCoverage(params, cases);
  if (vals.size < 10 || pairs.covered !== pairs.total || !pairs.total) { console.error(n, vals.size, pairs); process.exit(1); }
  if (n === 'button' && !cases.some((c) => c.options.isDisabled === true && c.options.style === 'outline')) { console.error('no disabled+outline case'); process.exit(1); }
  if (n === 'accordion' && !cases.some((c) => Array.isArray(c.options.items) && c.options.items.length === 7)) { console.error('no array case'); process.exit(1); }
  if (!cases.some((c) => c.colorScheme === 'wireframe')) { console.error('no wireframe case'); process.exit(1); }
}" || { echo "FAIL: the matrix lost option values or pairs" >&2; exit 1; }
echo "ok: the matrix keeps option values, arrays, wireframe and covers every option pair"

expect 0 "identical data passes" rc

# a dead builder's lock is taken over, not waited on
sha="$(git rev-parse --short=12 HEAD)"
mkdir -p "$w/cache/$sha.lock"; echo 999999 >"$w/cache/$sha.lock/pid"
expect 0 "a stale lock is taken over" env RC_CACHE="$w/cache" "$HERE/base-cli.sh" src HEAD

# a PR CLI that renders nothing is a vacuous run: exit 2
expect 2 "a vacuous run exits 2" rc --pr-cli /usr/bin/false --no-spec-sheet --png-sample 0

# a new recipe (no BASE recipe) is neutral: exit 0 and the NEUTRAL line; the neighbors are still compared
cp -R "$w/b" "$w/n"
for d in visuals components relationships; do
  sed 's/"badge"/"badge2"/g' "$w/n/packages/design-data/$d/badge.json" >"$w/n/packages/design-data/$d/badge2.json"
done
nc() { node "$HERE/render-compare.mjs" --base-root "$w/a" --pr-root "$w/n" --base-cli "$CLI" --pr-cli "$CLI" --png-sample 0 "$@"; }
expect 0 "a new recipe only is neutral" nc --components badge2
grep -q "^render-compare: NEUTRAL: new recipe(s) badge2 have no BASE recipe" "$w/out.txt" || { cat "$w/out.txt" >&2; echo "FAIL: no NEUTRAL line" >&2; exit 1; }
expect 0 "a new recipe plus an unchanged neighbor passes, neutral noted" nc --components badge,badge2 --sample 4
grep -q "NEUTRAL: new recipe(s) badge2 have no BASE recipe" "$w/out.txt" || { echo "FAIL: no NEUTRAL note" >&2; exit 1; }
# a new recipe plus a changed neighbor still compares the neighbor and fails on its diff
jq '.parts.container.props.fill = [{"value":"#ff0000"}]' "$w/n/packages/design-data/visuals/badge.json" >"$w/badge.json"
mv "$w/badge.json" "$w/n/packages/design-data/visuals/badge.json"
expect 1 "a new recipe plus a changed neighbor fails on the neighbor" nc --components badge,badge2 --sample 4
# a changed existing recipe that renders nothing on the PR is still vacuous, new recipe or not
expect 2 "a changed existing recipe rendering nothing is vacuous" nc --components badge,badge2 --pr-cli /usr/bin/false --no-spec-sheet
# a deleted (or renamed) recipe is not neutral
cp -R "$w/a" "$w/d"; rm "$w/d/packages/design-data/visuals/badge.json"
expect 2 "a deleted recipe is not neutral" node "$HERE/render-compare.mjs" --base-root "$w/a" --pr-root "$w/d" --base-cli "$CLI" --pr-cli "$CLI" --components badge --png-sample 0 --no-spec-sheet
rm -rf "$w/n" "$w/d"

# a recipe color change: the badge background becomes a literal red in the PR tree
jq '.parts.container.props.fill = [{"value":"#ff0000"}]' "$w/b/packages/design-data/visuals/badge.json" >"$w/badge.json"
mv "$w/badge.json" "$w/b/packages/design-data/visuals/badge.json"
expect 1 "a changed recipe color fails" rc
grep -q "render-compare: FAIL" "$w/out.txt" || { echo "FAIL: no FAIL line" >&2; exit 1; }

# an option-conditional change: the button outline fill when disabled turns red (needs enum x boolean)
cp -R "$w/b" "$w/c"
jq '.parts.container.props.fill[2].value = "#ff0000"' "$w/a/packages/design-data/visuals/button.json" >"$w/button.json"
mv "$w/button.json" "$w/c/packages/design-data/visuals/button.json"
expect 1 "an option-conditional recipe change fails with default settings" node "$HERE/render-compare.mjs" \
  --base-root "$w/a" --pr-root "$w/c" --base-cli "$CLI" --pr-cli "$CLI" --components button --png-sample 0 --no-spec-sheet
grep -q "render-compare: FAIL" "$w/out.txt" || { echo "FAIL: no FAIL line" >&2; exit 1; }
rm -rf "$w/c"

# the menu selected-item regression (bead 5m92.6.3): pinning the 8 single-selection start-edge ->
# label records to isSelected=false moves a selected item's label x 40 -> 20 and the menu width
# 276.9 -> 236.9. Only the spec sheet scene shows it (render --batch of the same request does not),
# so the harness must fail by default and name the menu sheet block; a control with the data
# unchanged passes. --collections-only keeps the run short (the sheet comparison always runs).
cp -R "$w/a" "$w/m"
jq '(.[71:79][] | .scope.options.isSelected) = false' "$w/a/packages/design-data/relationships/menu.json" >"$w/menu-rel.json"
mv "$w/menu-rel.json" "$w/m/packages/design-data/relationships/menu.json"
mc() { node "$HERE/render-compare.mjs" --base-root "$w/a" --pr-root "$1" --base-cli "$CLI" --pr-cli "$CLI" --components menu --png-sample 0 --collections-only "${@:2}"; }
expect 1 "the menu isSelected pin regression fails by default" mc "$w/m"
grep -q "menu / layout--spacing--icon-to-label-" "$w/out.txt" && grep -Eq "render.scene.(nodes|measurements)\[.*\]\.(x|w): " "$w/out.txt" || { echo "FAIL: the menu sheet scene diff is not named" >&2; exit 1; }
echo "ok: the failure names the menu sheet block and its scene geometry"
expect 0 "a control (same data) passes" mc "$w/a"
rm -rf "$w/m"

# wrong directory: the package dir is not a repo root, so the harness refuses (exit 2)
expect 2 "the wrong directory fails loudly" node "$HERE/render-compare.mjs" --base-root "$w/a/packages/design-data" \
  --pr-root "$w/b/packages/design-data" --base-cli "$CLI" --pr-cli "$CLI" --components button
grep -q "not a repo-root layout" "$w/out.txt" || { echo "FAIL: wrong-directory message missing" >&2; exit 1; }

# a layout with no relationships: refused, not rendered vacuously
rm -rf "$w/b/packages/design-data/relationships"
expect 2 "missing relationships fail loudly" rc
echo "render-compare selftest: OK"
