---
"@adobe/spectrum-tokens": minor
---

Add static and theme-aware transparent color families (closes #1345, #1346, #1347).

- **color-palette.json**: add `transparent-static-white-*`/`transparent-static-black-*`
  (36 tokens, aligned to the opacity foundation scale) and theme-aware
  `transparent-neutral-*`/`transparent-neutral-inverse-*` (72 tokens, light/dark/wireframe).
- **color-palette.json**: deprecate legacy `transparent-white-*`, `transparent-black-*`, `white`,
  and `black` tokens in favor of the new `transparent-static-*` families.
