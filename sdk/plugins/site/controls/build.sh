#!/bin/sh
# Copyright 2026 Adobe. All rights reserved.
# Bundle the Spectrum Web Components the site's control panel uses into
# ../assets/spectrum-controls.js and write ../assets/THIRD-PARTY-NOTICES.txt.
# Dependencies are pinned by package.json and pnpm-lock.yaml in this directory, so the output
# is reproducible. Run from anywhere; needs pnpm and network access.
# To change versions: edit package.json, then run `UPDATE_LOCK=1 sh build.sh` and commit the lockfile.
# The build happens in a temp dir outside the pnpm workspace, so the root lockfile is untouched.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cp "$here/entry.js" "$here/package.json" "$here/notices.mjs" "$tmp/"
[ -f "$here/pnpm-lock.yaml" ] && cp "$here/pnpm-lock.yaml" "$tmp/"
cd "$tmp"
if [ "${UPDATE_LOCK:-}" = 1 ]; then
  pnpm install --ignore-workspace --lockfile-only
  pnpm install --ignore-workspace --frozen-lockfile
  cp pnpm-lock.yaml "$here/pnpm-lock.yaml"
else
  pnpm install --ignore-workspace --frozen-lockfile
fi
npx esbuild entry.js --bundle --minify --format=esm --target=es2022 \
  --legal-comments=eof --metafile=meta.json --outfile="$here/../assets/spectrum-controls.js"
node notices.mjs meta.json "$(node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('meta.json')).outputs)[0])")" \
  "$here/../assets/THIRD-PARTY-NOTICES.txt" "$here/../../../../LICENSE"
