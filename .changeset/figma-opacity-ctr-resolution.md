---
"@adobe/spectrum-design-data": patch
---

Resolve inline-value opacity CTRs in `figma diff`.

- **sdk/core/src/graph.rs**: added `opacity.json` to `INLINE_CTR_COMPARABLE_SCHEMAS`
  so component-level opacity CTRs (e.g. `table-row-hover-opacity`) index into
  `relationship_tokens` and resolve during diff, matching the existing
  dimension/multiplier/gradient-stop handling.
