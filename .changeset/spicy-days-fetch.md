---
"@adobe/spectrum-tokens": minor
---

Updated popover border colors:

popover-border-color: transparent-white-25 (light theme)
popover-border-color: gray-400 (dark theme)

## Design Motivation

We've received feedback from Adobe Concept (Kelly Hurlburt) that `1px` `gray-200` border in dark theme doesn't provide sufficient visual contrast when used on `background-color-layer-2`.

## Token Diff

Updated (1)

`popover-border-color`:

- `schema`: `alias.json` -> `color-set.json`
- `value`: `gray-200` ->
  - `light.value`: `transparent-white-25`
  - `dark.value`: `gray-400`
