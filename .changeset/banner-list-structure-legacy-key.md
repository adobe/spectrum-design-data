---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": minor
"@adobe/spectrum-tokens": minor
---

Fix the `structure` field being silently dropped from generated legacy token
keys, which broke five banner/list gap and padding tokens.

- **fields/structure.json**: remove `excludeFromLegacyKey: true`; `structure`
  now participates in legacy key generation like any other field.
- **layout.tokens.json**: regenerates `gap-horizontal`, `gap-vertical`,
  `padding-horizontal`, `padding-vertical` to `banner-gap-horizontal`,
  `banner-gap-vertical`, `banner-padding-horizontal`, `banner-padding-vertical`;
  regenerates `gap-regular` to `list-gap-regular`. The five old generic keys
  are kept as deprecated aliases (`renamed` to their corrected names) so no
  existing consumer breaks.
- **spectrum-tokens**: `packages/tokens/src/layout.json` and the six files
  aliasing these tokens are regenerated with the corrected names.
