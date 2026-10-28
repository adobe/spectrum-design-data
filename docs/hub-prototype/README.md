<!-- Copyright 2026 Adobe. All rights reserved. -->

# Hub prototype

A static, data-driven component page modeled on the Spectrum Hub design. `design-data site` resolves every token binding in the visual recipes (`packages/design-data/visuals/`) at build time, and a small vanilla JS runtime lays out and draws each scene in the browser. There is no server and no WASM at runtime.

```bash
cd sdk && cargo build -p design-data-cli
cd .. && sdk/target/debug/design-data site --out docs/hub-prototype/dist
node docs/hub-prototype/serve.mjs   # optional: local preview at http://localhost:4173
```

The output is `index.html`, `backend.js`, `visual-runtime.js`, `data.json` and `.nojekyll`. It uses relative URLs only, so you can publish it to any static host, including a GitHub Pages project site. The page lists every component but only those with a recipe are selectable.

`visual-runtime.js` mirrors the Rust renderer (`sdk/core/src/visual.rs`); `sdk/wasm/test/visual-runtime-parity.test.js` keeps the two in lockstep. The WASM `Dataset.renderScene` API remains for apps that need live token data.
