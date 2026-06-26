---
"@adobe/design-data": minor
---

Decompose variant, alignment, anatomy, and object from property into structured fields.

- **packages/design-data/tokens/color-aliases.tokens.json**: extract `variant` (46 tokens:
  accent, negative, primary, etc.) and `object` (3 tokens) from property slugs.
- **packages/design-data/tokens/typography.tokens.json**: extract `alignment` from baked
  property slugs (3 tokens: text-align-center/end/start).
- **packages/design-data/tokens/layout-component.tokens.json**: extract `anatomy` (45 tokens:
  counter, description, label, etc.) and `object` (1 token) from property slugs.
- **packages/design-data/tokens/color-component.tokens.json**: extract `anatomy` from
  baked property slugs (5 tokens).
