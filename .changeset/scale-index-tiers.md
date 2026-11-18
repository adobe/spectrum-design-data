---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Fields can now declare which token tiers they apply to.

- **field.schema.json**: adds optional `allowedTokenTiers` (primitive, semantic, component).
- **fields/scaleIndex.json**: limits `scaleIndex` to primitive and semantic tokens.
- **spec/taxonomy.md**: documents the property and that no rule enforces it yet.
- **conformance/manifest-extensions**: rejects an empty list and an unknown tier.
