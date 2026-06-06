# @adobe/design-data-wasm

## 0.1.0

### Minor Changes

- [#1138](https://github.com/adobe/spectrum-design-data/pull/1138) [`a393c71`](https://github.com/adobe/spectrum-design-data/commit/a393c7132af49b92852e88b2632451f61a1e67bb) Thanks [@GarthDB](https://github.com/GarthDB)! - Extract portable domain logic from cli/tui/wasm into core; fix wasm resolve bug.
  - **wasm Dataset::resolve()**: delegates to `cascade::resolve_property`, fixing a
    latent bug where Platform-layer overrides did not beat Foundation tokens.
  - **core::authoring::draft**: `derive_token_key_from_parts` unifies TUI and MCP key
    assembly under one rule and fallback.
  - **core::component** (new): `validate_id`, `lookup`, `list` for disk-backed
    component lookup; feeds MCP `describe_component`.
  - **core::write**: `build_product_context_doc`, `merge_product_context_rationale`,
    `layer_target_filename`.
  - **core::cascade**: `parse_resolve_context`, `apply_restrictions`.
  - **core::graph**: `TokenGraph::infer_schema_url`.
  - **core::query**: `subsequence_score` (from TUI fuzzy.rs).
  - **core::validate**: `validate_catalog_dir`, `validate_catalog_schemas`.
  - **core::figma::mapping**: `summarize_variables`, `CollectionSummary`.

- [#1138](https://github.com/adobe/spectrum-design-data/pull/1138) [`a393c71`](https://github.com/adobe/spectrum-design-data/commit/a393c7132af49b92852e88b2632451f61a1e67bb) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `Dataset.primer()` to the wasm surface with full parity to the CLI payload.
  - **sdk/core/src/primer.rs** (new): shared `build()`, `PrimerData` structs, `SPEC_VERSION`.
    CLI and wasm now share primer assembly — no duplication.
  - **sdk/core/src/graph.rs**: `TokenGraph` gains `fields: Vec<FieldRecord>` and
    `manifest: serde_json::Value`; new `load_spec_fields()` and `with_fields()` helpers.
  - **sdk/core/src/cache/mod.rs**: schema v3 — new `FIELDS` ordinal table and `manifest`
    META key so fields and manifest survive blob round-trips.
  - **sdk/wasm/src/dataset.rs**: `Dataset.primer()` returns the standard primer shape
    `{ specVersion, tokenCount, modeSets, components, taxonomyFields, manifest, provenance }`.
  - **sdk/wasm/moon.yml**: `cache-build` adds `--fields-path` so embedded blob carries fields.

## 0.0.2

### Patch Changes

- [#1132](https://github.com/adobe/spectrum-design-data/pull/1132) [`9571455`](https://github.com/adobe/spectrum-design-data/commit/95714559f7598a74eb76513283ffc0ce9ec7d3fe) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix CI and apply post-review cleanups to `@adobe/design-data-wasm`.
  - **sdk/wasm/moon.yml**: add `local: true` to `cache-build` so moon CI skips it;
    the task is manual-only (embedded feature is disabled by default).
  - **.github/workflows/ci.yml**: use `dtolnay/rust-toolchain@1.88.0` tag form — removes
    the redundant `toolchain:` input and makes the pinned version self-evident.
  - **sdk/wasm/src/registry.rs**, **dataset.rs**: simplify `map_err(|e| js_err(e))` →
    `map_err(js_err)` at nine call sites.
  - **sdk/wasm/src/dataset.rs** (`resolve`): add NOTE comment on per-call sub-graph clone.
  - **sdk/wasm/src/types.rs** (`ValidationResult::from`): clarify intentional double-filter
    of `ValidationReport.errors` for error vs. warning split.
  - **sdk/wasm/README.md**: document that the `default` export condition resolves to the
    web build, requiring `await init()` in Deno/Bun and non-standard bundlers.
  - **sdk/wasm/test/parity.test.js**: add two tests asserting `fromTokens` throws on
    non-array input (plain object, string) rather than panicking.
  - **sdk/wasm/LICENSE**: correct appendix copyright to `Copyright 2026 Adobe` — matches
    the Apache-2.0 canonical template and Adobe's own OSS convention (e.g. react-spectrum).
