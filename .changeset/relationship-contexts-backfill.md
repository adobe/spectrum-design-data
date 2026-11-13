---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Backfill the structured context fields on 4,187 existing relationship records
that had a `context` string and no fields.

- `contextRole` (registry term ids) is derived from the main word, through the
  registry labels and aliases. Text in the trailing parenthesis becomes
  `contextPart` when it is a declared anatomy part of the record's component or a
  registry anatomy term (103 records), otherwise `contextQualifier` (1,818).
- No `context` string changes; it stays the identity key for recipes and the
  changelog. SPEC-090 is clean for every backfilled record.
- 197 records are skipped: 76 main words not in the registry, 95 strings that
  would not agree with the derived label, and 26 with unusual parentheses.
