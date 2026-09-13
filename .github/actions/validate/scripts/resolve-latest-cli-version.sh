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

# Prints the latest design-data-cli@* release version in <owner/repo>, or
# nothing if none exists. Paginates through the full releases list instead of
# relying on a fixed --limit, so a repo with many non-CLI releases can't push
# the design-data-cli tag off the window.
set -euo pipefail

repo="${1:?usage: resolve-latest-cli-version.sh <owner/repo>}"

gh api "repos/${repo}/releases" --paginate \
  --jq '.[].tag_name | select(startswith("design-data-cli@"))' \
  | sed 's/^design-data-cli@//' | sort -V | tail -1
