---
"@adobe/design-data-spec": minor
"@adobe/design-data-tui": minor
"@adobe/design-data-wasm": minor
---

Let a platform manifest carry field declarations as a first-class,
cascade-consumable `extensions` section (bead spectrum-design-data-h890.23.2),
continuing the cascade parity work started for components/platformExtensions
in h890.22.

- **packages/design-data-spec/schemas/manifest.schema.json**: `extensions`
  gains `fields` (array of `field.schema.json` items).
- **packages/design-data-spec/spec/manifest.md**: capability matrix and a new
  `extensions.fields` subsection document the add-or-replace-by-name
  semantics, including the `conceptOrder` name-reference caveat.
- **sdk/core/src/graph.rs**: `apply_platform_manifest` adds a guarded section
  that add-or-replaces into the field catalog by `name`, reusing the
  existing `FieldRecord`/`load_spec_fields` and `upsert_by_key` — no
  struct change, so no cache-schema-version bump is needed.
