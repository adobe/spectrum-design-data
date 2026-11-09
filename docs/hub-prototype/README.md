<!-- Copyright 2026 Adobe. All rights reserved. -->

# Hub prototype

A static, data-driven component page modeled on the Spectrum Hub design. `design-data site` resolves every token binding in the visual recipes (`packages/design-data/visuals/`) at build time, and the slim WASM engine (`sdk/wasm-visual`, the Rust solver `design_data_core::visual::solve`) lays out each scene in the browser; a small vanilla JS backend draws it. There is no server. New layout features are written once, in Rust.

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

`moon run hub-prototype:build` runs `build.mjs`, which builds the CLI and the engine (`node scripts/build.mjs web` in `sdk/wasm-visual`, needs `wasm-pack` and the `wasm32-unknown-unknown` target; output `pkg/web` is never committed), empties `dist/`, builds `dist/rsp/` and `dist/spios/` (each with `--engine sdk/wasm-visual/pkg/web`), writes `dist/platforms.json` and copies `landing.html` to `dist/index.html`.

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
moon run sdk-wasm-visual:build-web   # sdk/wasm-visual/pkg/web (never committed)
cd sdk && cargo build -p design-data-cli
cd .. && sdk/target/debug/design-data site --engine sdk/wasm-visual/pkg/web --out docs/hub-prototype/dist
```

The site needs the engine: without `--engine`, `design-data site` stops with a message saying how to build and pass it. `--data-only` writes everything except the renderer (for tests and data checks); the page then shows a banner that the engine is missing. The CLI does not embed the `.wasm`, so the binary stays small and nothing built is committed.

The output is `index.html`, `backend.js`, `constraints.js`, `content-controls.js`, `draw-helpers.js` (SVG path and icon helpers `index.html` uses to paint a scene), `spectrum-controls.js`, `THIRD-PARTY-NOTICES.txt`, `data.json`, `variants/`, `engine/`, `text-metrics.json`, `OFL-SourceSans3.txt`, `platform-switcher.js` and `.nojekyll`. The control panel uses Spectrum Web Components (Spectrum 2 theme), bundled into `spectrum-controls.js` by `sdk/plugins/site/controls/build.sh`. All URLs are relative, so you can publish it to any static host, including a GitHub Pages project site or a sub-path (checked at `/a/b/rsp/`). The page lists every component but only those with a recipe are selectable.

How the page renders:

* `data.json` (about 113 KB, was 7.4 MB) holds the component list, options, constraints, icons, Figma names, the platform and, per component, a summary (variant keys, option defaults, whether the recipe has a label and a swappable icon).
* `variants/<component>/<size>-<scheme>-<scale>.json` is one precompiled variant (about 74 KB, 7 KB gzip), the document `new Engine(json)` reads. `backend.js` fetches one the first time it draws that size and mode, builds an `Engine`, and keeps it.
* `engine/` is `design_data_wasm_visual.js` plus the `.wasm` (about 297 KB raw), loaded with a dynamic `import()` on the first scene.
* `text-metrics.json` is the table the CLI used (a `--text-metrics` file or the committed Source Sans 3 default). `backend.js` sends it as `request.textMetrics`, so labels measure as in `design-data render`. Never ship an Adobe Clean (kit) table with a hosted site.
* A failed fetch or solve shows a red message at the top of the page.

The `.wasm` is served by `serve.mjs` as `application/wasm`. Browsers need that type only for streaming compile; wasm-bindgen falls back to a plain compile with a console warning on any other type. The adt host's header is not verified yet; check it on the first redeploy (`curl -I .../rsp/engine/design_data_wasm_visual_bg.wasm`).

There is no JavaScript renderer: layout and text measurement run once, in Rust (`design_data_core::visual::solve`), and the page loads it as the slim WASM. The site's engine is checked against `design-data render` byte for byte in headless Chrome by `moon run sdk-wasm-visual:browser-parity` (not in CI; needs Chrome). The WASM `Dataset.renderScene` API remains for apps that need live token data.

## Navigating the stage

The stage is a viewport onto the rendered component. It opens fitted to the visible area. Scroll to pan, pinch or Ctrl/Cmd+scroll to zoom at the pointer, and drag empty space to pan. The bar in the corner has zoom out, the current level (click for actual size), zoom in, Fit and Full screen. With the stage focused: `+` and `-` zoom, `1` is actual size, `0` fits, `F` toggles full screen, arrow keys pan, and Escape leaves full screen. Anatomy and specs labels keep one size at any zoom: compact (10px) by default, and the Aa button (or `L`) switches to large labels (14px), a choice the page remembers. The label colors meet WCAG contrast at either size.

## Spec sheet and changelog (draft)

`build.mjs` generates everything from current data: `design-data spec-sheet --all` writes `data/sheets/<component>.json` and `index.json` for every component with relationships (generated, not committed), the committed changelogs (`packages/design-data/changelog/<component>.json`, written by `design-data changelog`) are copied next to them in `dist/specs/data/`, and `specs/` is copied to `dist/specs/`.

Open `/specs/` for the component index: each component links to its sheet and shows its current version, latest release and whether it has a visual. A sheet (`/specs/sheet.html?component=button&page=Layout`) draws each block's visual from the pre-rendered `render.svg` in the sheet JSON (`design-data spec-sheet --svg`, the same Rust renderer as `design-data render`), plus dimension bars from `scene.measurements`, and lists token rows, "Values updated" badges and the changelog: releases with component versions, one row per PR or commit with its changes, and a per-commit metadata summary. A component without a visual recipe has a table-only sheet and says "No visual recipe yet". The page does no layout of its own.

### Links between pages

`build.mjs` also copies `tools/figma-spec-plugin/figma-files.json` to `dist/specs/data/figma-files.json`. A sheet and the `/specs/` index link to the component's generated Figma spec file when the registry has an entry (the files are in a test folder, so only people with access can open them), and a sheet with a visual links back to `../rsp/?c=<component>`. The explorer shows "Spec sheet and changelog" only when `../specs/data/sheets/index.json` exists, so a single local build is unchanged.
