---
"@adobe/spectrum-design-data": minor
---

Apply space-between gap-endpoint decomposition to layout-component tokens (closes 04c.6).

- **packages/design-data/tokens/layout-component.tokens.json**: Decompose 115
  `{a}-to-{b}` compound property values into structured `property: "space-between"`
  plus `from`/`to` endpoint fields; legacy keys unchanged (verified by roundtrip).
