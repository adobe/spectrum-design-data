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
# Tests for cli-asset-name.sh.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
script="$script_dir/cli-asset-name.sh"

expect() {
  local want="$1" os="$2" arch="$3" got
  got="$("$script" "$os" "$arch")"
  if [[ "$got" != "$want" ]]; then
    echo "FAIL: $os/$arch -> '$got', want '$want'" >&2
    exit 1
  fi
}

expect design-data-linux-x64 Linux X64
expect design-data-darwin-arm64 macOS ARM64
expect design-data-darwin-x64 macOS X64

if "$script" Windows X64 2>/dev/null; then
  echo "FAIL: Windows/X64 should be unsupported" >&2
  exit 1
fi
if "$script" Linux ARM64 2>/dev/null; then
  echo "FAIL: Linux/ARM64 should be unsupported" >&2
  exit 1
fi

echo "ok"
