---
"@adobe/spectrum-design-data": minor
"token-mapping-analyzer": patch
---

Decompose component color properties into colorFamily + colorRole fields (closes beads #72c).

- **packages/design-data/fields/colorRole.json**: new `colorRole` field
  (position 16, scope color, excludeFromLegacyKey).
- **packages/design-data/registry/color-roles.json**: new registry —
  `primary` and `background` role values.
- **packages/design-data/tokens/icons.tokens.json**: 187 tokens atomized
  (`color-blue-primary` → `property:color` + `colorFamily:blue` + `colorRole:primary`).
- **sdk/core/src/naming.rs**: color-domain branch extended for component color
  tokens (`{component}-{property}-{colorFamily?}-{colorRole?}-{state?}`).
- **tools/token-mapping-analyzer/src/migrate-color-role.js**: new migration
  script for multi-field color property decomposition.
- **tools/token-mapping-analyzer/src/decomposer.js**: `serialize()` gains
  JS-parity color-domain branches matching the Rust serializer.
