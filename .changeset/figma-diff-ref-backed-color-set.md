---
"@adobe/design-data-wasm": minor
"@adobe/design-data-tui": minor
---

Route `$ref`-backed color-set CTR tokens (e.g. `action-bar-border-color`,
`popover-border-color`, `card-selection-background-color`) through the Figma
variables diff's per-mode comparison instead of reporting them
`skipped-uncovered` (closes spectrum-design-data-2god).

- **sdk/core/src/figma/import.rs**: `diff_values`'s multi-mode routing gate
  now also accepts a variable whose design-data token is CTR/relationship-backed
  (`graph.has_relationship_record`), not only one carrying a `conceptId`/`setUuid`
  directly on its resolved record — the link a `$ref`-backed color-set CTR carries
  only on its `RelationshipRecord`, never on the resolved `TokenRecord`.
