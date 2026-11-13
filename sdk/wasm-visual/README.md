<!-- Copyright 2026 Adobe. All rights reserved. -->

# [**@adobe/design-data-visual**](https://github.com/adobe/design-data-visual)

Slim, solve-only WebAssembly engine for component visual recipes (proposal 015, step 2). It holds one precompiled variant (no token graph, no dataset) and turns a `RenderRequest` into SVG or scene JSON by calling `design_data_core::visual::solve`. It has no layout code of its own. Published to npm as `@adobe/design-data-visual` (the Rust crate stays unpublished); not the 14 MB `@adobe/design-data-wasm`.

The package ships the engine (`pkg/node`, `pkg/web`) and the precompiled variants: `variants/<component>/<size>-<scheme>-<scale>.json` for every component with a recipe, plus `catalog.json` (component list, option defaults, variant keys). Source Sans 3 text metrics are built in (`OFL-SourceSans3.txt`).

```js
import init, { Engine } from "@adobe/design-data-visual"; // browser; Node needs no init
await init();
const variant = await (
  await fetch(
    "/node_modules/@adobe/design-data-visual/variants/button/m-light-desktop.json",
  )
).text();
const svg = new Engine(variant).svg(
  JSON.stringify({
    component: "button",
    size: "m",
    states: ["hover"],
    options: { variant: "accent" },
    mode: { colorScheme: "light", scale: "desktop" },
    label: "Save",
  }),
);
```

Switching size or mode means loading another variant file. Bundlers can import them with `@adobe/design-data-visual/variants/button/m-dark-desktop.json`.

```js
const engine = new Engine(variantJson); // { root, optionDefaults, parts, drawings }
engine.svg(
  JSON.stringify({
    component,
    size,
    states,
    options,
    mode: { colorScheme, scale },
    label,
    icon,
    textMetrics,
  }),
);
engine.scene(requestJson); // scene with diagnostics
Engine.fromCompiled(compiledJson, "m|light|desktop"); // one variant out of a site data.json compiled[name]
```

`size` and `mode` must be the variant's. `icon` is `"none"` or `{ set, name }`; `textMetrics` replaces the default Source Sans 3 table.

* Package: `moon run sdk-wasm-visual:build-package` writes `pkg/`, `variants/` and `catalog.json` (the variants come from `design-data site --data-only`); `moon run sdk-wasm-visual:verify-package` packs it and renders a packed variant. Released by `release.yml` (`build-wasm` job builds it, `release` verifies and publishes).
* Build: `moon run sdk-wasm-visual:build` (`pkg/node`) and `moon run sdk-wasm-visual:build-web` (`pkg/web`, what `design-data site --engine` copies into the site); never committed.
* Test: `moon run sdk-wasm-visual:test`: byte equality with `design-data render` (foundation and the iOS platform build), and budgets (both targets) of 326 KB raw, 127 KB gzip and 0.2 ms per scene.
* Not in `.github/ci-targets.json`; its Moon inputs are the renderer sources, so unrelated PRs hit the cache.
* Site parity: `moon run sdk-wasm-visual:browser-parity` loads a built site's engine in headless Chrome (Chrome and `pnpm install` for `playwright-core` needed) and compares its SVG with `design-data render` over the same matrix (`shared/matrix.mjs`). Excluded from CI.
