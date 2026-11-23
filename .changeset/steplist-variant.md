---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add a `variant` option (`default`, `emphasized`) to steplist.

- `default` draws the neutral colours; `emphasized` draws the accent colours
  (completed and current fills, current label, track), matching the Figma Web
  POC step list.
- The accent relationship records pin `variant: emphasized` and the neutral
  fill and label records pin `variant: default`. Disabled records pin both
  variants so they still win.
- The default variant has no neutral track record, so its track is not drawn.
- Legacy token output is unchanged.
