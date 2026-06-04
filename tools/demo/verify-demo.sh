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

# Verify that every shell command in the demo still works.
# Run from repo root:  bash tools/demo/verify-demo.sh
# Or via moon:         moon run demo:verify
#
# Manual-only steps NOT covered here (see scenarios.md):
#   A1  — S2 visualizer (browser required)
#   A4  — Claude Code agent question (interactive MCP)
#   B1  — open clean-component-example.json in editor

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
RESET='\033[0m'

step() { echo -e "\n${BOLD}==> $*${RESET}"; }
ok()   { echo -e "${GREEN}    ok${RESET}"; }
fail() { echo -e "${RED}    FAIL: $*${RESET}"; exit 1; }

# ─── Prerequisites ────────────────────────────────────────────────────────────

step "Check: repo root"
[[ -d "packages/design-data/components" ]] \
  || fail "Run this script from the spectrum-design-data repo root."
ok

step "Build: cargo build --release (design-data)"
cargo build --release --manifest-path sdk/Cargo.toml --bin design-data
ok

CLI="sdk/target/release/design-data"
[[ -x "$CLI" ]] || fail "Binary not found at $CLI after build."

step "Check: packages/design-data exists"
[[ -d "packages/design-data/components" ]] || fail "packages/design-data/components not found."
ok

# ─── Demo A — Prototype against Spectrum ─────────────────────────────────────

step "A2: design-data component button"
output=$("$CLI" component button \
  --components-dir packages/design-data/components 2>&1)
[[ "$output" == *"button"* ]] || fail "Expected 'button' in component output."
ok

step "A3: design-data query --filter component=button"
"$CLI" query packages/design-data/tokens --filter "component=button" > /dev/null
ok

# ─── Demo B — Blank design system ────────────────────────────────────────────

step "B2: design-data validate broken-token-example.tokens.json (expect SPEC-001)"
# Capture output; validate exits non-zero when errors are found — that's expected here.
b2_output=$("$CLI" validate tools/demo/broken-token-example.tokens.json 2>&1 || true)
[[ "$b2_output" == *"SPEC-001"* ]] \
  || fail "Expected SPEC-001 in validation output — demo 'catches mistakes' moment is broken."
ok

step "B3: design-data primer packages/design-data/tokens"
"$CLI" primer packages/design-data/tokens > /dev/null
ok

# ─── Bonus: full dataset runs without crashing ───────────────────────────────

step "Bonus: design-data validate packages/design-data/tokens --strict (runs without crashing)"
# Exits non-zero when validation errors are present, which is normal for an in-progress system.
# Assert it runs and produces output, not that the dataset is clean.
bonus_output=$("$CLI" validate packages/design-data/tokens --strict 2>&1 || true)
[[ -n "$bonus_output" ]] \
  || fail "Expected validation output for full dataset — command may have crashed silently."
ok

# ─────────────────────────────────────────────────────────────────────────────

echo -e "\n${GREEN}${BOLD}==> All demo commands verified.${RESET}"
