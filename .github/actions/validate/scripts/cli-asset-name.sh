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
# Usage: cli-asset-name.sh <RUNNER_OS> <RUNNER_ARCH>
# Prints the design-data-cli release asset name for a GitHub runner.
set -euo pipefail

os="${1:-}"
arch="${2:-}"

case "$os/$arch" in
  Linux/X64) echo "design-data-linux-x64" ;;
  macOS/ARM64) echo "design-data-darwin-arm64" ;;
  macOS/X64) echo "design-data-darwin-x64" ;;
  *)
    echo "unsupported runner for the release binary: ${os:-?}/${arch:-?}" >&2
    exit 1
    ;;
esac
