---
"@adobe/design-data-spec": minor
---

Platform manifests can now own their component implementation mappings through a new
`extensions/implementations/` category, refining foundation defaults row by row.

- **schemas/implementation-mapping.schema.json**: new fragment schema — `component` plus
  implementation rows to upsert, or `op: "remove"` selectors.
- **schemas/component.schema.json**: implementations accept `package` and `importPath`
  together, and gain an optional `implementation` registry id.
- **spec/manifest.md**, **spec/component-format.md**: document ownership, upsert identity,
  remove selectors, and foundation-default layering.
- **conformance/manifest-extensions/**: valid and invalid fixtures for the new category.
