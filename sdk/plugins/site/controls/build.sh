#!/bin/sh
# Copyright 2026 Adobe. All rights reserved.
# Bundle the Spectrum Web Components the site's control panel uses into
# ../assets/spectrum-controls.js. Run from anywhere; needs pnpm and network access.
# The build happens in a temp dir outside the pnpm workspace, so the lockfile is untouched.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cp "$here/entry.js" "$tmp/entry.js"
cd "$tmp"
echo '{"name":"controls","private":true,"type":"module"}' > package.json
pnpm add --ignore-workspace --save-exact \
  @spectrum-web-components/theme@1.12.5 \
  @spectrum-web-components/picker@1.12.5 \
  @spectrum-web-components/menu@1.12.5 \
  @spectrum-web-components/switch@1.12.5 \
  @spectrum-web-components/status-light@1.12.5 \
  @spectrum-web-components/help-text@1.12.5 \
  @spectrum-web-components/button@1.12.5 \
  esbuild@0.28.2
npx esbuild entry.js --bundle --minify --format=esm --target=es2022 \
  --legal-comments=none --outfile="$here/../assets/spectrum-controls.js"
