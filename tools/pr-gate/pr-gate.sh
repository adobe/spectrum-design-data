#!/usr/bin/env bash
# Copyright 2026 Adobe. All rights reserved.
#
# pr-gate: run, locally, the CI checks that your branch's changes affect.
#
# It runs `moon ci` on the targets from .github/ci-targets.json (the same list
# the CI workflow uses), limited to the ones moon finds affected between the
# merge base with origin/main and HEAD. It then repeats two checks CI runs
# outside moon: the committed legacy output check (only when design-data:legacy-output
# is affected; CI always runs it) and the changeset linter (always).
# --list skips the clean-tree check; mode-only changes never count as dirty.
#
# Usage: tools/pr-gate/pr-gate.sh [--list] [--base REF] [--render-compare]
#   --list            print the affected CI targets and exit (fast, no build)
#   --base REF        compare against REF instead of origin/main
#   --render-compare  also run tools/render-compare --changed (slow, advisory)
#
# Commit first: moon compares commits, so uncommitted changes are not checked.
# The last lines are a summary to paste into the PR body.

set -uo pipefail

base_ref="origin/main"
list_only=0
render_compare=0
while [ $# -gt 0 ]; do
  case "$1" in
    --list) list_only=1 ;;
    --base) base_ref="$2"; shift ;;
    --render-compare) render_compare=1 ;;
    -h|--help) sed -n '4,18p' "$0"; exit 0 ;;
    *) echo "pr-gate: unknown option $1" >&2; exit 2 ;;
  esac
  shift
done

root=$(git rev-parse --show-toplevel) || exit 2
cd "$root" || exit 2

fail() { echo "pr-gate: $*" >&2; exit 2; }

if [ "$list_only" = 0 ]; then
  [ -z "$(git -c core.fileMode=false status --porcelain --untracked-files=no)" ] \
    || fail "uncommitted changes: commit them first (moon only sees commits)."
fi

if [ "$base_ref" = "origin/main" ]; then git fetch -q origin main || fail "git fetch failed"; fi
merge_base=$(git merge-base "$base_ref" HEAD) || fail "no merge base with $base_ref"
head_sha=$(git rev-parse HEAD)

# Affected CI targets = moon's affected tasks that are also in ci-targets.json.
ci_list=$(jq -r '.node[], .rust[]' .github/ci-targets.json | sort)
affected_list=$(MOON_BASE="$merge_base" MOON_HEAD="$head_sha" \
  moon query tasks --affected 2>/dev/null | jq -r '.options.affected.tasks | keys[]' | sort) \
  || fail "moon query failed"
targets=$(comm -12 <(echo "$affected_list") <(echo "$ci_list"))
# PR_GATE_ONLY="a:b c:d" narrows the run to those targets (they must be affected).
if [ -n "${PR_GATE_ONLY:-}" ]; then
  targets=$(comm -12 <(echo "$targets") <(tr ' ' '\n' <<<"$PR_GATE_ONLY" | sort))
fi

echo "pr-gate: base $(git rev-parse --short "$merge_base") ($base_ref), head $(git rev-parse --short HEAD)"
echo "pr-gate: $(echo "$targets" | grep -c .) of $(echo "$ci_list" | grep -c .) CI targets affected:"
echo "$targets" | sed 's/^/  /'
[ "$list_only" = 1 ] && exit 0

# moon tasks call ../../sdk/target/debug/design-data. When CARGO_TARGET_DIR
# points elsewhere, link sdk/target to it, or those tasks run a missing or stale binary.
if [ -n "${CARGO_TARGET_DIR:-}" ]; then
  if [ ! -e sdk/target ]; then
    ln -s "$CARGO_TARGET_DIR" sdk/target
    trap '[ -L sdk/target ] && rm -f sdk/target' EXIT
    echo "pr-gate: linked sdk/target -> $CARGO_TARGET_DIR"
  elif [ -L sdk/target ]; then
    [ "$(readlink sdk/target)" = "$CARGO_TARGET_DIR" ] \
      || fail "sdk/target links to $(readlink sdk/target), not CARGO_TARGET_DIR=$CARGO_TARGET_DIR"
  else
    fail "sdk/target is a real directory but CARGO_TARGET_DIR=$CARGO_TARGET_DIR: moon tasks would use a stale binary. Remove one of them."
  fi
fi

if [ ! -d node_modules ]; then
  echo "pr-gate: no node_modules: running pnpm install --frozen-lockfile"
  pnpm install --frozen-lockfile || fail "pnpm install failed"
  chmod 644 tools/design-data-mcp/src/cli.js 2>/dev/null || true
fi

if echo "$targets" | grep -qx 'sdk:test' && ! command -v cargo-nextest >/dev/null; then
  fail "sdk:test is affected and needs cargo-nextest (CI uses 0.9.114): cargo install cargo-nextest --locked"
fi

free_gb=$(df -g "$root" | awk 'NR==2 {print $4}')
[ "${free_gb:-0}" -ge 15 ] || fail "only ${free_gb} GB free on $(df "$root" | awk 'NR==2 {print $1}'); need 15."

declare -a rows
status=0

if [ -n "$targets" ]; then
  start=$(date +%s)
  # shellcheck disable=SC2086
  WASM_NO_OPT=1 moon ci $targets --base "$merge_base" --head "$head_sha"
  moon_rc=$?
  mins=$(( ($(date +%s) - start) / 60 ))
  # One row per requested target, from moon's report (labels look like RunTask(a:b)).
  report=.moon/cache/ciReport.json
  if [ -f "$report" ]; then
    while IFS=$'\t' read -r t st; do
      echo "$targets" | grep -qx "$t" && rows+=("| $t | $st |")
    done < <(jq -r '.actions[] | select(.label | startswith("RunTask(")) | [(.label | ltrimstr("RunTask(") | rtrimstr(")")), .status] | @tsv' "$report" 2>/dev/null)
  fi
  if [ "$moon_rc" = 0 ]; then rows+=("| moon ci ($mins min) | PASS |"); else rows+=("| moon ci ($mins min) | FAIL (exit $moon_rc) |"); status=1; fi
fi

# CI's extra step: legacy-output must leave packages/tokens/src unchanged.
if echo "$targets" | grep -qx 'design-data:legacy-output'; then
  if [ -n "$(git status --porcelain -- packages/tokens/src)" ]; then
    git diff --stat -- packages/tokens/src
    rows+=("| legacy output unchanged | FAIL: packages/tokens/src changed (add \"excludeFromLegacy\": true, or fix). Review, then git checkout -- packages/tokens/src |")
    status=1
  else
    rows+=("| legacy output unchanged | PASS |")
  fi
else
  rows+=("| legacy output unchanged | skipped (design-data:legacy-output not affected; CI always runs it) |")
fi

# Lint Changesets workflow.
if node tools/changeset-linter/src/cli.js check --fail-on-warnings; then
  rows+=("| changeset linter | PASS |")
else
  rows+=("| changeset linter | FAIL |"); status=1
fi

# Render compare workflow (advisory in CI).
if [ "$render_compare" = 1 ]; then
  node tools/render-compare/render-compare.mjs --changed
  case $? in
    0) rows+=("| render-compare --changed (advisory) | PASS |") ;;
    2) rows+=("| render-compare --changed (advisory) | VACUOUS (expected for a new component; run neighbors) |") ;;
    *) rows+=("| render-compare --changed (advisory) | DIFF |") ;;
  esac
fi

echo
echo "### pr-gate $(git rev-parse --short HEAD) vs $(git rev-parse --short "$merge_base")"
echo
echo "| Check | Result |"
echo "|---|---|"
for r in "${rows[@]+"${rows[@]}"}"; do echo "$r"; done
echo
echo "Not covered: CLI minimum gate, release-only checks, Figma comparison, load-sensitive timeouts, changeset-lint check-data-bump, render-compare (advisory, opt-in via --render-compare)."
exit "$status"
