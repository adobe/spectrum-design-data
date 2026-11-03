---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Add the radio-button visual recipe.

- Radio button gets reviewed anatomy (container, control, selection-indicator, label,
  focus-indicator) and `size` and `isDisabled` options.
- The three Spectrum 1 `Control (selected, non emphasized)` records (neutral background
  colors) are replaced by content-color records for the neutral selected tokens that the
  component's token bindings already name.
- New `Control`, `Control (disabled)` and `Control (rounding)` relationships.
- The recipe binds everything through relationships and has render snapshots.
