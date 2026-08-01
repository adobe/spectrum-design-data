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
#
# ponytail: plain bash timing harness, no benchmarking framework. Measures the
# incremental dev loop this bead cares about: edit one core file, then time
# `cargo test -p design-data-core --no-run` (compile+link only) and a full
# `cargo test -p design-data-core` (adds test-run time). Runs 3x and reports
# the median so a single slow run doesn't skew the comparison.
#
# Usage: bash sdk/scripts/bench-build.sh   (run from anywhere; cd's to sdk/)

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

TOUCH_FILE="core/src/graph.rs"
RUNS=3

median() {
  # args are seconds (floats); print the median
  printf '%s\n' "$@" | sort -n | awk '{a[NR]=$1} END{print a[int((NR+1)/2)]}'
}

time_cmd() {
  local start end
  start=$(date +%s.%N)
  "$@" >/dev/null 2>&1
  end=$(date +%s.%N)
  awk -v s="$start" -v e="$end" 'BEGIN{printf "%.2f", e-s}'
}

echo "== Rust SDK incremental build benchmark =="
echo "Touching $TOUCH_FILE before each run to force a real incremental core rebuild."
echo

no_run_times=()
full_times=()

for i in $(seq 1 "$RUNS"); do
  echo "-- run $i/$RUNS --"
  echo "// bench-build touch $(date +%s%N)" >> "$TOUCH_FILE"
  t=$(time_cmd cargo test -p design-data-core --no-run)
  echo "  compile+link only (--no-run): ${t}s"
  no_run_times+=("$t")

  echo "// bench-build touch $(date +%s%N)" >> "$TOUCH_FILE"
  t=$(time_cmd cargo test -p design-data-core)
  echo "  full test (compile+link+run): ${t}s"
  full_times+=("$t")
done

# Clean up the touch lines we appended.
git checkout -- "$TOUCH_FILE" 2>/dev/null || true

echo
echo "== Medians =="
echo "compile+link only : $(median "${no_run_times[@]}")s"
echo "full test          : $(median "${full_times[@]}")s"
echo
echo "Tip: re-run 'cargo build --workspace --timings' separately for the cold-build"
echo "compile-vs-link breakdown (writes target/cargo-timings/*.html)."
