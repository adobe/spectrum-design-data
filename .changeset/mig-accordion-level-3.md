---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Migrate accordion relationship records and recipe to structured identity. Accordion moves from
status level 1 to level 3. The legacy `@adobe/spectrum-tokens` output and the rendered SVGs are
unchanged.

- Fused names decompose: `component-height-75..300` becomes `height` with a `size` pin,
  `font-size-100..400` becomes `font-size` with a `size` pin, `line-height-100` becomes
  `line-height`, `accordion-focus-indicator-gap` becomes `gap`, and `content-color` becomes `color`.
- The header and content `space-between` records get a `between` so each context has its own
  identity; the three header `Paddings` records use `padding`. The `Disabled` title color moves
  to part `accordion-item` so it no longer shares an identity with the neutral title colors.
- The recipe binds by part and identity instead of by `context`. Its context selectors go to 0.
- No uuid, `legacyKey`, `$ref`, `context` or `contextRole` change; deprecated records are untouched.
- The accordion spec sheet regroups the size-dependent rows (a size label becomes a size
  condition); every row still appears once and the other 91 sheets are unchanged.
