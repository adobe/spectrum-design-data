---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Fields can now declare which token tiers they apply to.

- **field.schema.json**: adds optional `allowedTokenTiers` (primitive, semantic, component).
- **fields/scaleIndex.json**: limits `scaleIndex` to primitive and semantic tokens.
- **token.schema.json**: adds optional `tokenTier`, an override of the derived tier.
- **field.schema.json**: adds `impliesTokenTier`, which drives the derived tier.
- **SPEC-102** warns when a field is used on a tier it excludes; **SPEC-103** reports overrides.
- **spec/taxonomy.md**: defines the tiers and the derivation; foundation is a group, not a tier.
- **conformance/manifest-extensions**: rejects an empty list and an unknown tier.
