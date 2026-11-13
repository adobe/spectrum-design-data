---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Add relationship contexts and structured context fields to the 20 records in
`bar-panel`, `standard-panel`, `in-field-button` and `form-item` that had none.

- Panels: `Gripper` and `Gripper (drag)`, `Width (default)`, `Width (minimum)`,
  `Width (maximum)`, and `Title` for the standard-panel title font size.
- `in-field-button`: `Width (stacked)` and `Rounding (stacked, inner)`.
- `form-item` gap: `Spacing (label to field, field to help text)`.
- No existing context string is changed.
- Lowers the SPEC-092 baseline for these components.
