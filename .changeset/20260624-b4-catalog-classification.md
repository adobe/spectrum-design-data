---
"@adobe/design-data-tui": minor
---

Add catalog-aware token classification (Phase B / B4, closes #122.4).

- **sdk/scripts/generate-registry-data.js**: emit `build_field_catalog()` alongside
  `build_registry_map()` — 24 field entries with position, validation severity,
  scope, required, has_registry, and value_type embedded at compile time.
- **sdk/core/src/registry.rs**: add `FieldValidation`, `FieldCatalogEntry`, and
  `FieldCatalog::embedded()` / `get()` types backed by the generated catalog.
- **sdk/core/src/authoring/session.rs**: new `validate_classification` validates
  every name-object field against the catalog — unknown keys are errors, advisory
  out-of-vocab values are warnings, and SPEC-042 scope mismatches are warnings.
- **sdk/core/src/authoring/draft.rs**: add `FieldDiagnostic` (uses `report::Severity`)
  to carry advisory warnings in `ClassificationDraftDto`; `build_name_object` now
  orders fields by `serialization.position` and emits integer-typed fields as JSON
  numbers.
- **sdk/core/src/validate/rules/mod.rs**: widen `schema_domain` / `DOMAIN_SCHEMAS`
  to `pub(crate)` for reuse by the authoring validator.
