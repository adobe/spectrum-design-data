<!-- Copyright 2026 Adobe. All rights reserved. -->

# ui-sdk Switch styling spike

Spike for [proposal 020](../../docs/proposals/020-ui-sdk-styling-layer.md) (bead `spectrum-design-data-9fe.11`). Not part of the pnpm workspace.

```bash
# from the repo root, with a design-data CLI that matches this checkout
cd sdk && cargo build -p design-data-cli && cd ..
node tools/ui-sdk-spike/generate.mjs sdk/target/debug/design-data > tools/ui-sdk-spike/switch.css

cd tools/ui-sdk-spike/demo && npm install && npx vite
```

`generate.mjs` also writes `demo/public/expected.json` (resolved track and handle values for each base combination). In the demo page, compare each switch's computed style to it for both `data-color-scheme` values.
