---
"@adobe/spectrum-design-data": minor
---

Decompose drop-shadow-property and context-modifier residual tokens per
proposal 004 (closes spectrum-design-data-dsi.1).

- **packages/design-data/registry/structures.json**: add the `drop-shadow`
  structure entry.
- **packages/design-data/registry/variants.json**: register `ambient`,
  `dragged`, `elevated`, `pasteboard`, `elevated-key`, `dragged-key` context
  variants.
- **packages/design-data/registry/property-terms.json**: add `x`/`y`
  property terms for drop-shadow offsets.
- **tools/token-mapping-analyzer/src/decomposer.js**: remove `drop-shadow`
  from `COMPOUND_PROPERTIES` and drop the now-redundant `context-modifier`/
  `drop-shadow-property` `KNOWN_GAP_TERMS` entries.
- **packages/design-data/tokens/{color-aliases,color-component,layout,
  layout-component}.tokens.json**: migrate 70 tokens into `structure`/
  `variant`/`property` fields. `structure` is excluded from legacy-key
  reconstruction in `naming.rs`, so `name.legacyKey` is pinned on every
  touched token to keep the decomposition publish-invisible.
