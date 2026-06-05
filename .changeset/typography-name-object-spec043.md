---
"@adobe/spectrum-design-data": minor
"@adobe/spectrum-tokens": minor
"@adobe/design-data-spec": minor
---

Add SPEC-043 domain-identifying fields to all 72 typography token name objects
(closes #1125).

- **tokens/typography.tokens.json**: add `weight` (font-weight × 6, composite × 15),
  `style` (× 2), `family` (× 4), `scaleIndex` (font-size × 36), `structure` (margin
  multipliers × 5), and `scaleIndex`+`family:cjk` (line-height × 4) — zero SPEC-043
  advisory warnings for this file.
- **registry/scale-values.json**: add `25` entry for `font-size-25` (`scaleIndex: 25`).
- **spec/taxonomy.md**: add `structure` row to the typography field table; broaden
  NORMATIVE SHOULD clause to all five fields accepted by SPEC-043.
