---
"@adobe/design-data-wasm": minor
---

Add `Dataset.primer()` to the wasm surface with full parity to the CLI payload.

- **sdk/core/src/primer.rs** (new): shared `build()`, `PrimerData` structs, `SPEC_VERSION`.
  CLI and wasm now share primer assembly — no duplication.
- **sdk/core/src/graph.rs**: `TokenGraph` gains `fields: Vec<FieldRecord>` and
  `manifest: serde_json::Value`; new `load_spec_fields()` and `with_fields()` helpers.
- **sdk/core/src/cache/mod.rs**: schema v3 — new `FIELDS` ordinal table and `manifest`
  META key so fields and manifest survive blob round-trips.
- **sdk/wasm/src/dataset.rs**: `Dataset.primer()` returns the standard primer shape
  `{ specVersion, tokenCount, modeSets, components, taxonomyFields, manifest, provenance }`.
- **sdk/wasm/moon.yml**: `cache-build` adds `--fields-path` so embedded blob carries fields.
