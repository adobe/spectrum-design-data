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
