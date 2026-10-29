---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-spec": patch
"@adobe/design-data-wasm": patch
---

Relationship fixes for checkbox and others; the pressed scale now includes nested parts.

- **relationships**: strip the stray "S2 " prefix from contexts (checkbox, radio-button,
  combo-box, text-area), matching switch.
- **checkbox**: add the selected+down fill, `Control` border colors, `Control (disabled)`,
  `Control (selected, disabled)`, `Control (error)` and `Control (selected, error)`;
  drop the mis-named `Checkbox colors`.
- **visuals/checkbox.json**: bind to those contexts; `pressTarget` is now `control`.
- **sdk/core, site runtime**: a pressed part's nested children scale with it.
- **spec**: `pressTarget` scales nested parts.
- **switch**: document that `isReadOnly` has no distinct visual (hover and press only).
- Rendered output is unchanged except the selected+down fill and the pressed mark scale.
