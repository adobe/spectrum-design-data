---
"@adobe/design-data-spec": minor
---

Add SPEC-035 (`anatomy-part-name-registry-sync`) advisory warning rule.

Fires when a component anatomy part's `name` is not in the `anatomy-terms.json`
registry from `@adobe/design-system-registry`. Sibling of SPEC-034
(`component-category-registry-sync`) for the anatomy-terms vocabulary.

- `rules/rules.yaml` — adds SPEC-035 (severity: warning, category: naming-consistency)
- SDK: new `spec035.rs` rule using the existing `for_field("anatomy")` accessor on
  `RegistryData`
- `spec/anatomy-format.md` — extends SPEC rules table; adds note pointing to registry as
  authoritative vocabulary
- `spec/registry.md` — adds SPEC-035 to the "Validated by" line for `anatomy-terms.json`
- `docs/rfc-coordination.md` — marks anatomy-part name registry-sync gap as resolved
- Conformance fixtures: `conformance/valid/SPEC-035/` and `conformance/invalid/SPEC-035/`
