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

# Build the Claude Desktop extension (design-data.mcpb) and attach it to GitHub Releases.
#
# Called by release.yml after `changeset publish`, with PUBLISHED set to the action's
# `publishedPackages` JSON. Does nothing when @adobe/design-data-mcp was not published in
# this run. Uploads two copies of the same file:
#
#   1. to the package's own release, `@adobe/design-data-mcp@<version>`, as design-data.mcpb;
#   2. to a rolling release, `design-data-mcpb`, so README can link one URL that never changes
#      (`releases/latest` cannot: releases are tagged per package, and the newest release is
#      often another package).
#
# Environment:
#   PUBLISHED   JSON array of { name, version } from changesets/action (required)
#   GH_TOKEN    token that can create releases and upload assets (required unless DRY_RUN=1)
#   DRY_RUN     when 1, build and print the gh commands instead of running them
#   SKIP_BUILD  when 1, reuse an existing dist/design-data.mcpb (tests)

set -euo pipefail

ROLLING_TAG="design-data-mcpb"
cd "$(dirname "$0")/.."

: "${PUBLISHED:?PUBLISHED (changesets publishedPackages JSON) is required}"

VERSION=$(printf '%s' "$PUBLISHED" | jq -r '[.[] | select(.name == "@adobe/design-data-mcp")][0].version // empty')
if [ -z "$VERSION" ]; then
  echo "@adobe/design-data-mcp was not published in this run; nothing to attach."
  exit 0
fi
TAG="@adobe/design-data-mcp@${VERSION}"

gh_run() {
  if [ "${DRY_RUN:-0}" = "1" ]; then
    echo "[dry-run] gh $*"
  else
    gh "$@"
  fi
}

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  node scripts/generate-mcpb.mjs
  pnpm exec mcpb validate dist/design-data-mcp-bundle
  pnpm exec mcpb pack dist/design-data-mcp-bundle dist/design-data.mcpb
fi

# A .mcpb is a zip: refuse to publish anything that is not one, or that has no manifest.
test -s dist/design-data.mcpb || { echo "dist/design-data.mcpb is missing or empty" >&2; exit 1; }
unzip -p dist/design-data.mcpb manifest.json | jq -e --arg v "$VERSION" '.version == $v' >/dev/null \
  || { echo "manifest.json in the bundle does not declare version ${VERSION}" >&2; exit 1; }

# The package release is normally created by changesets/action; make sure it exists.
if ! gh_run release view "$TAG" >/dev/null 2>&1; then
  gh_run release create "$TAG" --title "$TAG" --notes "Release of ${TAG}."
fi
gh_run release upload "$TAG" dist/design-data.mcpb --clobber

# Rolling release: created once, then only its asset and notes change. Not marked latest,
# so it never displaces the repository's real latest release.
if ! gh_run release view "$ROLLING_TAG" >/dev/null 2>&1; then
  gh_run release create "$ROLLING_TAG" --title "Claude Desktop extension (latest)" \
    --notes "The newest design-data.mcpb, for Claude Desktop. Drag it into Settings, Extensions." \
    --latest=false
fi
gh_run release upload "$ROLLING_TAG" dist/design-data.mcpb --clobber
gh_run release edit "$ROLLING_TAG" \
  --notes "design-data.mcpb for @adobe/design-data-mcp ${VERSION}. Drag it into Claude Desktop, Settings, Extensions."

echo "Attached design-data.mcpb (${VERSION}) to ${TAG} and ${ROLLING_TAG}."
