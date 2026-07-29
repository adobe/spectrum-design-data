---
"@adobe/spectrum-design-data": patch
---

Decompose the final grab-bag of fused `name.property` residue left after
284.3/284.6 (closes spectrum-design-data-284.7).

- **registry/variants.json**: register `base`/`layer` (context) and `hero`
  (card emphasis) variant ids.
- **registry/property-terms.json**: register `rounding-increment`.
- **color-aliases.tokens.json**: `background-{base,layer-1,layer-2}-color`
  split into `variant`/`object`/`property`.
- **typography.tokens.json**: `default-font-family` simplified to atomic
  `property:"font-family"`.
- **layout-component.tokens.json**: split `card-selection-background-size`,
  coach-indicator ring rounding-increments, `menu-item-section-divider-
  height`, `radio-button-selection-indicator`, `table-border-divider-width`,
  `collection-card-minimum-height-hero-*`, `drop-zone-cjk-title-font-size`.
- **layout.tokens.json**: `side-focus-indicator` split into
  `orientation`/`anatomy`/`property`.
- `opacity-checkerboard-square-{dark,light}` intentionally left atomic
  (design-asset swatch).
