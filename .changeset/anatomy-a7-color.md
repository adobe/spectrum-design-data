---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": patch
---

Apply the colour anatomy (A7) and migrate identity (5m92.5.8).

- color-handle, color-loupe, color-area, color-slider, color-wheel: anatomy reviewed, explicit
  `container`, nested-component parts and a `fill` part. Options `color`, `hasFill`, `isOpen`,
  `label` added; `background` and `channel` dropped. The loupe is a second top-level part of
  the handle; its 12px offset moves to the handle as `space-between`.
- color-wheel drops its `color-area` part; color-control is a reviewed shared base.
- swatch: `border` and `inner-border` become container styling (selected border and band are
  records pinned `isSelected`, the band colour is `outline-color`); `value` option; `tooltip`
  part. The inner band is no longer drawn (the renderer has no second stroke).
- thumbnail: the 4px checkerboard record is rescoped to `size` on `opacity-checkerboard`.
- Legacy records take the part, attribute and context of the S2 record that aliases them.
  Three loupe "S1 Shadows" records with no legacy key are removed.
- Levels: the six colour components 0 to 2; swatch and thumbnail 1 to 2.

Legacy `@adobe/spectrum-tokens` output is byte-identical.
