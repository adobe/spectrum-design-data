---
"@adobe/design-data-spec": patch
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": patch
---

Recipe `when.options` conditions now accept an array of values, as the spec already described.

- **sdk/core, site runtime**: an array matches when any value matches and counts as one condition.
- **spec**: component-visuals states that an array counts as one condition.
- **button**: static color rules for primary and secondary share one entry with `variant: [...]`.
