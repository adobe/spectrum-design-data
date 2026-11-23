---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Fix the combo-box visual recipe, which drew every state as a tiny empty square.

- The container width now binds the `width` relationship (field-width-*), so the
  field has a size without a width option. `width` is listed in `notVisual`,
  like picker and text-field.
- The field draws the in-field menu trigger button (the `in-field-button`
  component) at the end and the alert icon when `isError` is set. The
  `error-icon` anatomy part gains `presentWhen: isError`.
- Not drawn: the chevron points right (the engine ignores `rotation` on a root
  icon), the button sits at the field start while there is no value (nested row
  `justify` is not supported), the placeholder, autocomplete suggestion,
  loading circle and the label position.
- Goldens and recipe snapshots are regenerated. Legacy token output is unchanged.
