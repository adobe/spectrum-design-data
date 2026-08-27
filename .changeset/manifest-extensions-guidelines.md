---
"@adobe/design-data-spec": minor
"@adobe/design-data-tui": minor
"@adobe/design-data-wasm": minor
---

Let a platform manifest carry guideline documents as a first-class,
cascade-consumable `extensions` section (bead spectrum-design-data-h890.23.1),
continuing the cascade parity work started for components/platformExtensions
in h890.22.

- **packages/design-data-spec/schemas/manifest.schema.json**: `extensions`
  gains `guidelines` (array of `guideline.schema.json` items).
- **packages/design-data-spec/spec/manifest.md**: capability matrix and a new
  `extensions.guidelines` subsection document the add-or-replace-by-name
  semantics.
- **sdk/core/src/graph.rs**: `apply_platform_manifest` adds a guarded section
  that add-or-replaces into the guideline catalog by `name`, reusing the
  existing `GuidelineRecord`/`load_spec_guidelines` and `upsert_by_key` — no
  struct change, so no cache-schema-version bump is needed.
