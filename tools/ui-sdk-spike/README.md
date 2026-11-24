<!-- Copyright 2026 Adobe. All rights reserved. -->

# ui-sdk styling spike (Switch, Checkbox)

Spike for [proposal 020](../../docs/proposals/020-ui-sdk-styling-layer.md) (beads `spectrum-design-data-9fe.11`, `9fe.13`). Not part of the pnpm workspace.

```bash
# from the repo root, with a design-data CLI that matches this checkout
cd sdk && cargo build -p design-data-cli && cd ..
for c in switch checkbox; do node tools/ui-sdk-spike/generate.mjs $PWD/sdk/target/debug/design-data $c; done

cd tools/ui-sdk-spike/demo && npm install && npx vite --host 127.0.0.1
# open /?c=checkbox (or c=switch) and run: await check('light'); await check('dark')
```

`generate.mjs <cli> <component>` writes `<component>.css` and `demo/public/<component>.expected.json` (resolved values for each base combination). `check(scheme)` in the demo page compares every rendered combination's computed style with it. Result: Switch 32 per scheme, Checkbox 96 per scheme, 0 differences. Hover, down and focus-visible rules are generated but not checked in the browser.

## What the generator still hard-codes (data gaps for RFC #2098)

The `components` table in `generate.mjs` is the only per-component code, and every entry in it is something the data does not say:

1. **ui-sdk slot names** for the root and each anatomy part (`checkbox`, `checkbox-indicator`, `switch-thumb`). Needs per-implementation part names.
2. **Which options are state and which are appearance.** `isSelected`, `isIndeterminate`, `isDisabled` and `isError` are attributes ui-sdk sets (`data-checked`, `data-indeterminate`, `data-disabled`, `data-invalid`). `isEmphasized` is ours (`data-variant="emphasized"`). Needs a `kind` flag on options.
3. **Option merging.** Checkbox's `isSelected` + `isIndeterminate` are one tri-state attribute in ui-sdk (`indeterminate` overrides selected). The data has two booleans.
4. **Which scene part is the root** (`track` for switch, `box` for checkbox) and which part carries the icon (`checkmark` or `dash`, both mapped to the one `checkbox-indicator`).
5. **How the label attaches**: `label:has(> root)`. ui-sdk wraps in a plain `<label>`; the anatomy has a `label` part but nothing says it is the wrapping element.
6. **Layout glue**: the thumb is positioned by `translate`, the check mark by centering. The recipe has x/y only; flex centering is a guess.
7. **The icon glyph.** The recipe draws a check path; ui-sdk takes any child, so the demo supplies its own SVG and only size and color come from the data.
8. **Per-state ordering and selectors** (`:hover`, `:active`, `:focus-visible`) are a fixed table, not in the data.
9. **`data-invalid`** is set by the demo directly; whether ui-sdk's Field sets it for the checkbox was not checked.

## Other frameworks (`demo-fw/`, bead 9fe.13)

The same generated `switch.css` and `checkbox.css` run unchanged in `@ui-sdk/solid`, `/vue`, `/svelte` and `/web` (all `0.1.0-beta.16`). `demo-fw/` has one page per framework (`solid.html`, `vue.html`, `svelte.html`, `web.html`, each with `?c=switch|checkbox`) and one shared `check.js`. Result in headless Chrome, both schemes: Switch 32 and Checkbox 96 combinations per scheme and framework, 0 differences, 0 missing.

```bash
cd tools/ui-sdk-spike/demo-fw && npm install --legacy-peer-deps && npx vite --host 127.0.0.1   # Node >= 22.12 (Vite 8)
# open /<framework>.html?c=checkbox and run: await check('light'); await check('dark')
```

Differences from React that the data or a generator would have to know:

10. **Markup is the same in React, Solid, Vue and Svelte**: a `<button data-slot="checkbox|switch" role=...>` root, the indicator or thumb `<span data-slot="...">` inside, a hidden `<input data-slot="...-input">` sibling, and the same `data-checked`, `data-unchecked`, `data-indeterminate`, `data-disabled` attributes. Extra attributes pass through to the root in all four.
11. **Web components have no shadow DOM.** `ui-checkbox` and `ui-checkbox-indicator` are light-DOM custom elements, and they carry `data-slot`, `role` and the state attributes themselves (there is no inner button and no hidden input). The same selectors match, so parts are styleable from outside, but the root is not a `button`: any CSS that assumed a button's default `display` or border needs the explicit values the generator already emits. The wrapping label gets a generated id and `aria-labelledby`. Options are HTML attributes (`default-checked`, `disabled`).
12. **Solid needs Solid 2** (`solid-js` and `@solidjs/web` ^2), `@solidjs/vite-plugin` 3 (Vite 8, Node >= 20.19 or 22.12; this repo pins Node ~20.12) and compilation of the `.jsx` files the package ships (the plugin's `include` must reach `node_modules/@ui-sdk/solid`). `@ui-sdk/core` must be left out of Vite's pre-bundling for every framework. Solid 2's `<For>` also passes plain items, not accessors, which broke the first demo draft.
13. **Option names differ by framework in the call, not in the DOM**: `defaultChecked` (React, Solid, Svelte), `default-checked` (Vue, web). The generator never sees these; they are the author's side of the adapter.
