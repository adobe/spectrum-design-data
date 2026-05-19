---
"@adobe/spectrum-tokens": minor
"@adobe/design-system-registry": minor
---

Classify 5 margin multiplier tokens; add margin property-terms and typography structures.

- **tokens/typography.json**: 5 tokens gain `name` objects using `{ structure, property }` shape.
  `body-margin-multiplier` → `{ structure: "body", property: "margin" }`;
  `detail/heading-margin-{top,bottom}-multiplier` follow the same pattern.
- **registry/property-terms.json**: add `margin`, `margin-top`, `margin-bottom`.
- **registry/structures.json**: add `body`, `detail`, `heading` typography-scale structures.
- **token-names/names/typography.json**: sidecar entries for all 5 tokens.
- Reduces SPEC-017 (`string-name-tech-debt`) warning count by 5.
