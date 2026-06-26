---
"@adobe/design-data": minor
---

Decompose variant, alignment, anatomy, and object from property into structured fields.

- **packages/design-data/tokens/color-aliases.tokens.json**: extract `variant` (46 tokens:
  accent, negative, primary, etc.) and `anatomy` (3) and `object` (3) from property slugs.
- **packages/design-data/tokens/typography.tokens.json**: extract `alignment` from baked
  property slugs (3 tokens: text-align-center/end/start).
- **packages/design-data/tokens/layout-component.tokens.json**: extract `anatomy` from
  baked property slugs (61 tokens: counter, description, label, etc.).
- **packages/design-data/tokens/layout.tokens.json**: extract `anatomy` from baked
  property slugs (8 tokens).
- **packages/design-data/tokens/color-component.tokens.json**: extract `anatomy` from
  baked property slugs (5 tokens).
