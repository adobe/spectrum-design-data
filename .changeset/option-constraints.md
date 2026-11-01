---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
---

Add `constraints` to the component format: if-then rules that limit valid option combinations.

- **spec/option-constraints.md**: `when` / `require` / `severity` (`error` or `advisory`).
- **component.schema.json**: optional `constraints` array. Layer 1 checks shape only; Layer 2
  checks names and values.
- **button, action-button, checkbox**: first constraints, taken from react-spectrum S2.
