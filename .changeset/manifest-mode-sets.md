---
"@adobe/design-data-wasm": minor
"@adobe/design-data-tui": minor
---

Platform manifests can now declare platform-local mode sets via `extensions/mode-sets/`,
scoped to that platform's resolution (declare-or-replace by name, same as
`extensions/fields/`).

- **sdk/core/src/manifest.rs**: added `mode-sets` to `CONCAT_CATEGORIES`, wiring
  per-fragment validation against `mode-set.schema.json`.
- **sdk/core/src/graph.rs**: `apply_platform_manifest` now reads `extensions.modeSets`
  and upserts each into `graph.mode_sets` (cascade and SPEC-005 already operate on it
  generically).
- **design-data-spec**: documented `extensions/mode-sets/` in `manifest.md` and
  `mode-sets.md` (closes spectrum-design-data-h890.24).
