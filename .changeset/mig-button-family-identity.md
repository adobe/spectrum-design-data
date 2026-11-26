---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Migrate button, action-button and badge relationship records and recipes to structured identity.
The legacy `@adobe/spectrum-tokens` output and every rendered SVG are unchanged.

- Button, action-button and badge move from status level 1 to level 3. Every live record gets a
  `scope.part` (and `scope.attribute` for background and border color), and the recipes bind by
  property, part and `between` instead of `context` (context selectors 86 to 0).
- Fused names decompose: `component-height-*` becomes `minimum-height` (`height` on action-button),
  `font-size-*` and `line-height-font-size-*` become `font-size` and `line-height`, and the edge
  spacing names become `space-between` between a `start-edge`, `top-edge`, `bottom-edge` or
  `end-edge` and `icon`, `label` or `hold-icon`, each with a `size` pin. The icon-only records pin
  `isLabelHidden`, `hideLabel` or `label: false`.
- Identity collisions clear by giving the colliding records one `context`: button `Fill`, `Outline`
  and the two static focus-indicator records (which pin `staticColor`), the badge `Background`
  records, the button wrapping corner radii (which pin the new `isLabelWrapped` option, default
  false) and the icon-only spacing records. The progress fill records of button and action-button
  use `content-color`.
- Their spec sheets merge a few rows that share a token and value.
