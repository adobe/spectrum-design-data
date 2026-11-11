---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Add relationship contexts and structured context fields to the 24 `table`
records that had none, and rename three existing ones.

- 15 row heights reuse `Row height (minimum, <density> density)`; a record with
  no `density` option is regular. 6 section-header heights reuse
  `Section header row height`.
- 3 selected-row backgrounds get `Background (selected row, highlight
  selection)` and its hover variant. The three existing records drop the `S1 `
  prefix and take the same strings, because highlight selection is live in S2.
- Lowers the `table` SPEC-091 and SPEC-092 baselines.
