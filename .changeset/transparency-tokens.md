---
"@adobe/spectrum-design-data": minor
"@adobe/spectrum-tokens": minor
---

Add static and theme-aware transparent colors, deprecate the old ones (#1345, #1346, #1347).

- **tokens/color-palette.tokens.json**: add `transparent-static-white-*` and
  `transparent-static-black-*` (36 tokens), plus theme-aware `transparent-neutral-*` and
  `transparent-neutral-inverse-*` (108 tokens across light, dark, wireframe). Alpha equals the
  matching `opacity-*` step and matches the S2/Web Figma library's opacity links.
- **tokens/color-palette.tokens.json**: deprecate `transparent-white-*`, `transparent-black-*`,
  `white`, and `black` with `replacedBy` mappings from #1346. Scales don't map 1:1: 8 of the
  26 numbered tokens match exactly, the rest are approximate, and `-25` maps to `-0`.
  Legacy values are unchanged.
- **registry/color-families.json**: register the four new color families.
- **packages/tokens/src/color-palette.json**: regenerated legacy output; the 28 deprecated
  tokens gain `deprecated`, `deprecated_comment`, and `renamed`.
