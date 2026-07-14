---
"@adobe/spectrum-design-data": patch
---

Pin `name.legacyKey` on ordering-mismatch residual tokens to keep published
keys stable (closes spectrum-design-data-dsi.3).

- **packages/design-data/tokens/{color-aliases,color-component,icons,layout,
  layout-component,semantic-color-palette,typography}.tokens.json**: 224
  tokens decompose cleanly but their published legacy key's field order
  (e.g. density-before-size, `key-focus` state ordering) doesn't match
  the canonical serialize order. `name.legacyKey` is pinned to each
  token's existing published key via the same escape hatch used by
  dsi.1, keeping the change publish-invisible.
