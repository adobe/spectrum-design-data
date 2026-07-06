---
"@adobe/spectrum-design-data": minor
---

Phase D: decompose compound size-* property values into structured size field for 24 tokens.

- **packages/design-data/tokens/layout-component.tokens.json**: extracted size field from
  compound properties (e.g. `handle-size-large` → `property: size` + `size: l`);
  legacy keys unchanged.
