---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
---

Fields can now declare which token tiers they apply to.

- **field.schema.json**: adds optional `allowedTokenTiers` (primitive, semantic, component).
- **fields/scaleIndex.json**: limits `scaleIndex` to primitive and semantic tokens.
- **conformance/manifest-extensions**: rejects an empty list and an unknown tier.
