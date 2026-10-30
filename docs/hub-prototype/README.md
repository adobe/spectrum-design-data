<!-- Copyright 2026 Adobe. All rights reserved. -->

# Hub prototype

A static, data-driven component page modeled on the Spectrum Hub design. `design-data site` resolves every token binding in the visual recipes (`packages/design-data/visuals/`) at build time, and a small vanilla JS runtime lays out and draws each scene in the browser. There is no server and no WASM at runtime.

```bash
cd sdk && cargo build -p design-data-cli
cd .. && sdk/target/debug/design-data site --out docs/hub-prototype/dist
node docs/hub-prototype/serve.mjs   # optional: local preview at http://localhost:4173
```

The output is `index.html`, `backend.js`, `constraints.js`, `visual-runtime.js`, `spectrum-controls.js`, `data.json` and `.nojekyll`. The control panel uses Spectrum Web Components (Spectrum 2 theme), bundled into `spectrum-controls.js` by `sdk/plugins/site/controls/build.sh`. It uses relative URLs only, so you can publish it to any static host, including a GitHub Pages project site. The page lists every component but only those with a recipe are selectable.

`visual-runtime.js` mirrors the Rust renderer (`sdk/core/src/visual.rs`); `sdk/wasm/test/visual-runtime-parity.test.js` keeps the two in lockstep. The WASM `Dataset.renderScene` API remains for apps that need live token data.

## Navigating the stage

The stage is a viewport onto the rendered component. It opens fitted to the visible area. Scroll to pan, pinch or Ctrl/Cmd+scroll to zoom at the pointer, and drag empty space to pan. The bar in the corner has zoom out, the current level (click for actual size), zoom in, Fit and Full screen. With the stage focused: `+` and `-` zoom, `1` is actual size, `0` fits, `F` toggles full screen, arrow keys pan, and Escape leaves full screen. Anatomy and specs labels keep one readable size at any zoom.
