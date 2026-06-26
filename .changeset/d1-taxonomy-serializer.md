---
"@adobe/spectrum-design-data": minor
"@adobe/spectrum-tokens": minor
---

Phase D: taxonomy field serializer + size decomposition pilot.

- **sdk/core/src/naming.rs**: Generalize `extract_legacy_key` to walk the
  field catalog in `serialization.position` order, expanding registry ids to
  their `tokenName` long-forms (e.g. `size:"xl"` → `"extra-large"`). Excludes
  mode-set, color-domain, and legacy metadata annotation fields. Output is
  byte-identical for all current tokens (all gates pass).
- **sdk/core/src/registry.rs**: Add `token_name(field, id) -> Option<&str>`
  to `RegistryData`, backed by the embedded registry JSON.
- **sdk/scripts/generate-registry-data.js** + **registry_data.rs**: Generate
  `build_token_name_map()` alongside the existing `build_registry_map()`.
- **packages/design-data/tokens/layout-component.tokens.json**,
  **layout.tokens.json**: 68 layout tokens decomposed — `size` extracted from
  `property` into the structured field (HIGH-confidence, all roundtrip-verified).
- **tools/token-mapping-analyzer/test/apply.test.js**: Verify roundtrip
  invariant on already-migrated tokens.
