---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Migrate accordion relationship records and recipe to structured identity. Accordion moves from
status level 1 to level 3. The legacy `@adobe/spectrum-tokens` output is unchanged.

- Fused names decompose: `component-height-75..300` becomes `height` with a `size` pin,
  `font-size-100..400` becomes `font-size` with a `size` pin, `line-height-100` becomes
  `line-height`, `accordion-focus-indicator-gap` becomes `gap`, and `content-color` becomes `color`.
- 30 header and content `space-between` records get a `between`, and the three header `Paddings`
  records use `padding`, so each context has its own identity. The `Disabled` title color moves to
  part `accordion-item`; the recipe's title, chevron and content colors read it when `isDisabled`.
- The recipe binds by part and identity instead of by `context` (context selectors 17 to 0).
- Renders are unchanged except one case: an open item with `content` text in the `down` state now
  draws the content in the neutral text color; before, an accidental solver pick drew it disabled grey.
- The accordion spec sheet regroups size rows (the size moves into a row condition); every row
  still appears once. The recipe snapshots now set `content` text for accordion.
