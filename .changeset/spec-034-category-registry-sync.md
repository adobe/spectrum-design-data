---
"@adobe/design-data-spec": minor
"@adobe/design-system-registry": major
---

Close RFC #661 category validation gap: add SPEC-034 advisory rule and
align the `data-visualization` category id across all surfaces.

- `spec/registry.md` — marks the categories.json gap closed; SPEC-034
  is now the authoritative validator for `meta.category`.
- `schemas/component.schema.json` — loosens `meta.category` from a
  hard-coded enum to a free-form string; SPEC-034 (warning-level) is
  the single source of validation.
- `rules/rules.yaml` — adds SPEC-034
  (`component-category-registry-sync`, severity: warning).
- `packages/design-system-registry/registry/categories.json` — removes
  the `"data visualization"` alias from `data-visualization`; kebab-case
  is the sole canonical form.
- `components/table.json` — migrates `meta.category` from
  `"data visualization"` to `"data-visualization"`.
- `docs/rfc-coordination.md` — RFC #661 open question marked resolved.
- SDK: new `spec034.rs` rule + `categories()` accessor on `RegistryData`
  + codegen updated to embed `categories.json`.
