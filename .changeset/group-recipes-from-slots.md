---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add visual recipes for button-group, action-group, swatch-group,
checkbox-group and radio-group, drawn from their default slot.
Button, action and swatch groups get a host part for the slot
(`buttons`, `action-buttons`, `swatches`). The gap records of
button-group and action-group now pin `size` and `density`, and
swatch-group gains the missing regular-density gap record.
