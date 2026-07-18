---
"@adobe/spectrum-design-data": patch
---

Pin `name.legacyKey` on 56 fused-property residual tokens in
`layout-component.tokens.json` (dg2) whose `property` string fuses a
relation, size, and density term in the reverse order from dsi.7
(size-before-density, e.g. `row-height-extra-large-regular`), so the
published legacy name round-trips through `serialize()` without requiring
decomposer changes.

- **packages/design-data/tokens/layout-component.tokens.json**: pinned
  `legacyKey` on 56 tokens (28 distinct property strings) across the
  `table` and `thumbnail` component families, resolved by `uuid` match against
  `packages/tokens/src/layout-component.json` — never reconstructed from
  the serialized name, per the dsi.3/dsi.7 house convention.
