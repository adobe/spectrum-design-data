---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": minor
---

Relaxed SPEC-025 so `anatomy` can anchor to a `structure` or a registry
term flagged `standaloneScope` (not just `component`), and added SPEC-049 to
validate the anatomy vocabulary for those non-component cases. Structured 27
previously-fused layout tokens accordingly (bead spectrum-design-data-bzo,
bucket 2); legacy names are unaffected.

- **sdk/core/src/validate/rules/spec025.rs**: relaxed anchor rule.
- **sdk/core/src/validate/rules/spec049.rs**: new rule, validates
  non-component anatomy values against `anatomy-terms.json`.
- **packages/design-data/registry/anatomy-terms.json**: flagged
  `focus-ring`/`focus-indicator` `standaloneScope: true`.
- **packages/design-data/components/table.json**: added `item` anatomy part.
- **packages/design-data/registry/property-terms.json**: added `indent`.
- **packages/design-data/tokens/layout.tokens.json**: structured
  `accessory-item-*`, `list-*`, `table-item-*`, `popover-*`, `field-width*`,
  and `focus-ring`/`focus-indicator` tokens.
- **tools/token-mapping-analyzer/src/apply.js**: matching guard relaxation.
- **design-data-spec**: `registry-value.json` schema + SPEC-049 rules/fixtures.
