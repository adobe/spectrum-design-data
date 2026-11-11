---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Add relationship contexts and structured context fields to 26 records in
`tabs`, `list-view`, `segmented-control` and `tree-view` that had none.

- Each new context reuses an existing string where the record is the same
  relationship at another size or option; `tabs` text uses `Label`.
- Two existing `tabs` contexts are renamed: `Regular density` becomes `Height`
  (regular is the default, so it carries no density) and `Height`, which sits on
  the compact-density record, becomes `Height (compact density)`. No recipe
  binds either string.
- Lowers the SPEC-091 and SPEC-092 baselines for these components.
