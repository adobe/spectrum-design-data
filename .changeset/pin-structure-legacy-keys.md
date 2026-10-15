---
"@adobe/spectrum-design-data": patch
---

Pin the corrected banner/list legacy keys explicitly (follow-up to #1517).

- **packages/design-data/tokens/layout.tokens.json**: add `name.legacyKey` to the five live
  `banner-gap-*`, `banner-padding-*` and `list-gap-regular` records. Generated output is unchanged.
