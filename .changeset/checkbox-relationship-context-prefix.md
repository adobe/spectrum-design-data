---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-spec": patch
"@adobe/design-data-wasm": patch
---

Relationship fixes for checkbox, switch and others; pressed scale includes nested parts.

- **relationships**: strip the stray "S2 " prefix from contexts (checkbox, radio-button,
  combo-box, text-area), matching switch.
- **checkbox**: add the selected+down fill, `Control` borders, `Control (disabled)`,
  `Control (selected, disabled)`, `Control (error)` and `Control (selected, error)`.
- **visuals/checkbox.json**: bind to those contexts; `pressTarget` is now `control`.
- **sdk/core, site runtime**: a pressed part's nested children scale with it.
- **switch, radio-button**: scope selected relationships with `isSelected: true`, not
  `state: ["selected"]` (clears 9 SPEC-054 warnings). The relationship schema now allows
  boolean option values and the renderer maps `isSelected`/`isDisabled` to their states.
- **switch**: document that `isReadOnly` has no distinct visual (hover and press only).
