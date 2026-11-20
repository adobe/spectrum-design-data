---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": minor
---

Identity migration of the remaining groups: avatar-group and swatch-group reach level 2; action-bar
gains parts but stays at level 1.

- avatar-group: the 7 size records get part `avatars` and a size pin, the font-family, weight,
  style and size records get part `label`, and `font-size-600` / `line-height-100` become
  `font-size` / `line-height` on `label` (the CJK line height is pinned `script: cjk`).
- swatch-group: the border colour and opacity records get part `container`; the colour record gets
  `attribute: border`. The legacy opacity record takes the context "Border" to end a collision.
- action-bar: every record outside the 17 misfiled Step records gets a part (`container`,
  `item-counter` or `close-button`) or a `between`; padding becomes `padding-vertical` /
  `padding-horizontal`; background, border and shadow colours get an attribute; the 3 "Background
  (default)" records join "Background".
- The `same-pin-set` and component-status baselines are regenerated. Legacy `@adobe/spectrum-tokens`
  output is byte-identical.
