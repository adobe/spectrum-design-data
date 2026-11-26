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

# Self-test for the scene comparison in gate.sh (labels ignored, geometry/color/value caught).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
# shellcheck source=gate-lib.sh
. ./gate-lib.sh

w="$(mktemp -d)"; trap 'rm -rf "$w"' EXIT
base='{"component":"c","measurements":[{"kind":"w","token":{"token":"a","chain":["x"],"value":4,"prop":"p"}}],"nodes":[{"fill":"#fff","tokens":[{"token":"a","chain":["x"],"value":4}]}]}'
echo "$base" >"$w/base.json"
jq '.measurements[0].token.token="b" | .measurements[0].token.chain=["y","z"] | .nodes[0].tokens[0].token="b" | .nodes[0].tokens[0].chain=[]' "$w/base.json" >"$w/labels.json"
jq '.nodes[0].fill="#000"' "$w/base.json" >"$w/color.json"
jq '.measurements[0].token.value=5' "$w/labels.json" >"$w/value-and-chain.json"

scenes_match "$w/base.json" "$w/labels.json" >/dev/null || { echo "FAIL: label-only difference must pass" >&2; exit 1; }
! scenes_match "$w/base.json" "$w/color.json" >/dev/null || { echo "FAIL: color change must fail" >&2; exit 1; }
! scenes_match "$w/base.json" "$w/value-and-chain.json" >/dev/null || { echo "FAIL: value change with chain change must fail" >&2; exit 1; }
echo "cli-minimum-gate selftest: OK"
