---
"@adobe/spectrum-design-data": patch
---

Fix `figma pair` to consult CTR resolution before value-matching (closes #11k.10.13).

- **sdk/core/src/figma/import.rs**: `pair_by_value`'s already-resolved skip
  gate now also checks `resolve_relationship_ref`, matching `figma diff`'s
  resolution order, so Typography-grouping and other CTR-only names
  (`Heading/`, `Body/`, `Title/`, `Detail/`, `Code/`, some `Alias/`) no longer
  wrongly fall through to the value-matching path and land in `ambiguous`.
