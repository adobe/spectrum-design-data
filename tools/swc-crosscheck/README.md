<!-- Copyright 2026 Adobe. All rights reserved. -->

# SWC cross-check (read-only)

Bead `spectrum-design-data-qkj5.373`. Compares the token bindings our recipes resolve (`design-data render --batch`, scene output) with SWC gen 2's component CSS (`token("...")` in `badge.css` and `button.css`), by role and by resolved value, in light and dark.

```bash
node tools/swc-crosscheck/compare.mjs sdk/target/debug/design-data \
  ~/Spectrum/spectrum-web-components/gen2/packages/swc/components
# OUT=report.json to choose where the per-finding JSON goes
```

SWC values come from its published `tokens.css` (version 15.6.0 of `@adobe/spectrum-tokens`), resolved per color scheme. Coverage: Badge by size and by variant (bold style); Button by size, and by variant, style and state (default, hover, down, keyboard-focus) at size M. Not covered: subtle badges, static colors, disabled and pending, icon-only, RTL, and the `calc()` geometry (padding minus border).

## Result (275 comparisons)

| | Badge | Button |
| --- | ---: | ---: |
| Same token | 60 | 35 |
| Same value, different token | 40 | 112 |
| Different value | 0 | 18 |
| SWC only | 4 | 4 |
| Ours only | 1 | 1 |

* **Different value (Button, 18):** all in two places. (1) `keyboard-focus`: SWC uses the hover look (label `neutral-content-color-key-focus`, outline background `gray-100`, outline border `gray-900` or `gray-400`); our recipe keeps the default label color (`gray-800`), a transparent outline background and `gray-800` or `gray-300` borders. (2) Outline `down` background: SWC `gray-100`, ours `gray-200`.
* **Different token, same value:** ours binds `base-height-*` where SWC binds `component-height-*`, and palette tokens (`color-gray-800-light`) where SWC binds semantic ones (`neutral-content-color-default`).
* **SWC only:** vertical padding (`base-padding-vertical-*`) for both components; our recipes set a fixed height instead. **Ours only:** Badge `workflow-icon-small` (SWC sets it outside a hook) and Button `corner-radius-full` (SWC derives the radius as half the height).
