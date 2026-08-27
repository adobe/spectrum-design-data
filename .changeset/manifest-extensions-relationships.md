---
"@adobe/design-data-spec": minor
"@adobe/design-data-tui": minor
"@adobe/design-data-wasm": minor
---

Let a platform manifest add, override, or remove Component/Token
Relationship (CTR) entries via a new `extensions.relationships` section
(bead spectrum-design-data-h890.23.3), continuing the cascade parity work
started for components/platformExtensions in h890.22.

- **packages/design-data-spec/schemas/manifest.schema.json**: `extensions`
  gains `relationships` (array of `relationship.schema.json` items, or
  `{op: "override"|"remove", uuid, value?}` targeting entries).
- **packages/design-data-spec/spec/manifest.md**: capability matrix and a
  new `extensions.relationships` subsection document the identity model —
  add is positional, override/remove require a `uuid` since relationships
  have no other stable key.
- **sdk/core/src/graph.rs**: `apply_platform_manifest` adds a guarded
  section handling add/override/remove, reusing the existing
  `RelationshipRecord` (already carries `uuid: Option<String>`) — no struct
  change, so no cache-schema-version bump is needed. An override/remove
  entry missing `uuid` is rejected with a clear error, not silently
  skipped.
