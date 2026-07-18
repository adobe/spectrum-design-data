---
"@adobe/spectrum-design-data": patch
---

Pin `name.legacyKey` on 56 fused-property residual tokens in
`layout-component.tokens.json` (dg2) whose `property` string fuses a
relation, size, and density term in the reverse order from dsi.7
(size-before-density, e.g. `row-height-extra-large-regular`). These
currently already round-trip correctly via `naming.rs`'s thin-format/
general-walk fallback (no active `serialize()` bug today) — the pin is a
forward-compatibility anchor so a future decompose() migration that splits
`property` into registered `size`/`density` sub-fields can't silently
reorder and rename the published key.

- **packages/design-data/tokens/layout-component.tokens.json**: pinned
  `legacyKey` on 56 tokens (28 distinct property strings) across the
  `table` and `thumbnail` component families, resolved by `uuid` match against
  `packages/tokens/src/layout-component.json` — never reconstructed from
  the serialized name, per the dsi.3/dsi.7 house convention.
