---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Align selected-row context wording with the highlight selection model, and fix a
copy-pasted avatar string. Renames 17 existing relationship context strings and
their structured fields; no recipe binds any of them.

- `tree-view` and `stack-item`: `Background (selected, emphasized)` becomes
  `Background (selected, highlight)`. List view, Tree view and Table dropped the
  emphasized option for checkbox or highlight selection.
- `tree-view`: the three `… (selected + highlight)` strings (two backgrounds and a
  border) become `… (selected, highlight)`, the same wording as the rest.
- `table`: `Background (selected row, non-emphasized)` and its hover variant
  become `… (selected row, checkbox selection)`, the neutral selected fill.
- `avatar`: `Text (List view item)` becomes `Text (initials)` on the six font
  records, which style the initials.
- `action-button` `Background (selected, emphasized)` is unchanged.
