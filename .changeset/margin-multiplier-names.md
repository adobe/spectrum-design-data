---
"@adobe/design-system-registry": minor
"@adobe/token-names": minor
---

Classify 5 margin multiplier tokens; add margin property-terms and typography structures.

- **registry/property-terms.json**: add `margin`, `margin-top`, `margin-bottom`.
- **registry/structures.json**: add `body`, `detail`, `heading` typography-scale structures.
- **token-names/names/typography.json**: sidecar entries for all 5 tokens using
  `{ structure, property }` shape.
- Reduces SPEC-017 (`string-name-tech-debt`) warning count by 5.
