---
"@adobe/design-system-registry": minor
"@adobe/token-names": minor
---

Classify line-height multiplier and CJK line-height multiplier tokens.

- **registry/property-terms.json**: add `line-height-multiplier` term (unitless ratio,
  distinct from absolute px line-height paired with a font-size tier).
- **sdk/validate/rules/mod.rs**: add `multiplier.json` to typography `DOMAIN_SCHEMAS`
  so the `family` field is permitted on CJK multiplier tokens (SPEC-042).
- **sdk/validate/rules/spec043.rs**: extend typography domain-required-fields check to
  accept `scaleIndex` and `structure` alongside `family`/`weight`/`style`.
- **token-names/names/typography.json**: sidecar entries for all 4 tokens.
- Reduces SPEC-017 warning count by 4.
