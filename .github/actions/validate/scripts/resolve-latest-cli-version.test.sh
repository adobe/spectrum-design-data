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

# Run: bash .github/actions/validate/scripts/resolve-latest-cli-version.test.sh
#
# Stubs `gh` on PATH to cover the two cases --limit 50/1000 couldn't: many
# pages of unrelated releases with no design-data-cli@ tag at all, and a
# design-data-cli@ tag buried among unrelated ones.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fake_bin="$(mktemp -d)"
trap 'rm -rf "$fake_bin"' EXIT

cat > "$fake_bin/gh" <<'EOF'
#!/usr/bin/env bash
# Stands in for `gh api repos/<repo>/releases --paginate --jq '...'`: emits
# what the real --jq filter would have already narrowed the paginated
# response down to.
case "$FAKE_GH_SCENARIO" in
  no-match)
    ;; # many unrelated releases, none matching design-data-cli@ — jq yields nothing
  with-match)
    printf 'design-data-cli@1.2.0\ndesign-data-cli@1.10.0\n'
    ;;
esac
EOF
chmod +x "$fake_bin/gh"

PATH="$fake_bin:$PATH"
export PATH

got="$(FAKE_GH_SCENARIO=no-match "$script_dir/resolve-latest-cli-version.sh" adobe/spectrum-design-data)"
if [[ -n "$got" ]]; then
  echo "no-match: expected empty output, got '$got'" >&2
  exit 1
fi

got="$(FAKE_GH_SCENARIO=with-match "$script_dir/resolve-latest-cli-version.sh" adobe/spectrum-design-data)"
if [[ "$got" != "1.10.0" ]]; then
  echo "with-match: expected 1.10.0 (highest by sort -V), got '$got'" >&2
  exit 1
fi

echo "ok"
