---
"@adobe/spectrum-tokens": minor
---

Phase D: decompose density field in 2 layout-component tokens (ye1.2).

- **packages/design-data/tokens/layout-component.tokens.json**: decomposed 2 tokens —
  `height-compact` → `height` + `density: compact` and `spacing-spacious` → `spacing` +
  `density: spacious`; Rust roundtrip verified clean.
