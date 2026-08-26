---
"@adobe/design-data-spec": minor
"@adobe/design-data-tui": minor
"@adobe/design-data-wasm": minor
---

Let a platform manifest carry component specs and platform-extension states
as first-class, cascade-consumable sections, not just tokens — the first
step in externalizing iOS-specific design data while keeping iOS capability
in the monorepo (bead spectrum-design-data-h890.22).

- **packages/design-data-spec/schemas/manifest.schema.json**: `extensions`
  gains `components` (array of `component.schema.json` items) and
  `platformExtensions` (array of `platform-extension.json` items).
- **sdk/core/src/graph.rs**: `apply_platform_manifest` adds two guarded
  sections — `extensions.components` add-or-replaces into the component
  catalog by name; `extensions.platformExtensions` add-or-replaces by
  `(platform, extends)` and rejects a `termId` that doesn't exist in the
  referenced base registry.
