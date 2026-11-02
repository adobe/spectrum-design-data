<!-- Copyright 2026 Adobe. All rights reserved. -->

# Hub prototype

A static, data-driven component page modeled on the Spectrum Hub design. `design-data site` resolves every token binding in the visual recipes (`packages/design-data/visuals/`) at build time, and a small vanilla JS runtime lays out and draws each scene in the browser. There is no server and no WASM at runtime.

```bash
moon run hub-prototype:build        # builds the CLI and every platform into dist/
node docs/hub-prototype/serve.mjs   # local preview at http://localhost:4173
```

## Layout

One deployment holds one build per platform, plus a landing page:

| Path              | Content                                                         |
| ----------------- | --------------------------------------------------------------- |
| `/`               | `landing.html`: a card per platform, read from `platforms.json` |
| `/rsp/`           | `design-data site --platform react-spectrum`                    |
| `/spios/`         | `design-data site --platform ios` (button aliases `button-ios`) |
| `/platforms.json` | `[{ id, label, path, description }]`, written by the build      |

`/rsp/` has no platform visuals (`platforms/react-spectrum` has no `extensions/visuals`), so it shows the foundation recipes through the React Spectrum cascade. Under `/spios/`, components without an iOS recipe keep their foundation recipe where one exists and are listed dimmed otherwise.

Each build's nav fetches `../platforms.json`. When it loads, the nav lists the other platforms (keeping the current `?c=` component) and an "All platforms" link. A single local build has no such file, so the nav is unchanged.

## Build task

`moon run hub-prototype:build` runs `build.mjs`, which builds the CLI, empties `dist/`, builds `dist/rsp/` and `dist/spios/`, writes `dist/platforms.json` and copies `landing.html` to `dist/index.html`.

## Add a platform

Add one entry (`id`, `label`, `path`, `description`) to the `platforms` list in `build.mjs`. The `id` is the `--platform` value. The landing page and the switcher read `platforms.json`.

## Deploy

The `.awesome/state.json` link is git-ignored and must stay in place.

1. Connect the VPN, then run `adt whoami`.
2. From `docs/hub-prototype`, run `adt deploy dist --publish-mode replace --wait`. Replace mode removes files from earlier deployments, such as the old root build.
3. If `.awesome/` is lost, relink with `adt deploy link --deployment-id 75e47275-3a8d-43cb-8db6-26076186fa3f`.

The site is at <https://design-data-visual-render.entapp.adproto.com/>.

## Single build

```bash
cd sdk && cargo build -p design-data-cli
cd .. && sdk/target/debug/design-data site --out docs/hub-prototype/dist
```

The output is `index.html`, `backend.js`, `constraints.js`, `visual-runtime.js`, `spectrum-controls.js`, `THIRD-PARTY-NOTICES.txt`, `data.json`, `platform-switcher.js` and `.nojekyll`. The control panel uses Spectrum Web Components (Spectrum 2 theme), bundled into `spectrum-controls.js` by `sdk/plugins/site/controls/build.sh`. It uses relative URLs only, so you can publish it to any static host, including a GitHub Pages project site. The page lists every component but only those with a recipe are selectable.

`visual-runtime.js` mirrors the Rust renderer (`sdk/core/src/visual.rs`); `sdk/wasm/test/visual-runtime-parity.test.js` keeps the two in lockstep. The WASM `Dataset.renderScene` API remains for apps that need live token data.

## Navigating the stage

The stage is a viewport onto the rendered component. It opens fitted to the visible area. Scroll to pan, pinch or Ctrl/Cmd+scroll to zoom at the pointer, and drag empty space to pan. The bar in the corner has zoom out, the current level (click for actual size), zoom in, Fit and Full screen. With the stage focused: `+` and `-` zoom, `1` is actual size, `0` fits, `F` toggles full screen, arrow keys pan, and Escape leaves full screen. Anatomy and specs labels keep one size at any zoom: compact (10px) by default, and the Aa button (or `L`) switches to large labels (14px), a choice the page remembers. The label colors meet WCAG contrast at either size.
