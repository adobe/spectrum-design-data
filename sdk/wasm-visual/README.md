<!-- Copyright 2026 Adobe. All rights reserved. -->

# design-data-wasm-visual

Slim, solve-only WebAssembly engine for component visual recipes (proposal 015, step 2). It holds one precompiled variant (no token graph, no dataset) and turns a `RenderRequest` into SVG or scene JSON by calling `design_data_core::visual::solve`. It has no layout code of its own. Private for now; not the 14 MB `design-data-wasm`.

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

* Build: `moon run sdk-wasm-visual:build` (`pkg/node`) and `moon run sdk-wasm-visual:build-web` (`pkg/web`, what `design-data site --engine` copies into the site); never committed.
* Test: `moon run sdk-wasm-visual:test`: byte equality with `design-data render` (foundation and the iOS platform build), and budgets (both targets) of 315 KB raw, 122 KB gzip and 0.2 ms per scene.
* Not in `.github/ci-targets.json`; its Moon inputs are the renderer sources, so unrelated PRs hit the cache.
* Site parity: `moon run sdk-wasm-visual:browser-parity` loads a built site's engine in headless Chrome (Chrome and `pnpm install` for `playwright-core` needed) and compares its SVG with `design-data render` over the same matrix (`shared/matrix.mjs`). Excluded from CI.
