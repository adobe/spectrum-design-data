---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Add relationship contexts and structured context fields to 29 records in
`stack-item`, `card`, `floating-action-button`, `color-handle`, `popover`,
`avatar`, `color-loupe`, `contextual-help`, `meter` and `picker` that had none.

- Each context reuses a string already on the component or used by a sibling
  component for the same relationship: `Border`, `Body`, `Title`, `Drop shadow`,
  `Background (selected, emphasized)`, and `Width (default)` for plain widths.
- No existing context string is changed.
- Lowers the SPEC-092 baseline for these components.
