---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Add relationship contexts and structured context fields to the 24 `table`
records that had none, and rename three existing ones.

- 15 row heights reuse `Row height (minimum, <density> density)`; a record with
  no `density` option is regular. 6 section-header heights reuse
  `Section header row height`.
- The 3 existing `S1 Selected row background (highlight selection)` records
  (accent tint, 0.1 and 0.15 opacity) drop the `S1 ` prefix and become
  `Background (selected row, highlight selection)` and its hover variant.
- The 3 non-emphasized selected-row backgrounds (neutral color) are a different
  relationship and get `Background (selected row, non-emphasized)` and its hover
  variant.
- Lowers the `table` SPEC-091 and SPEC-092 baselines.
