# @adobe/design-data-wasm

## 0.4.2

### Patch Changes

- [#1271](https://github.com/adobe/spectrum-design-data/pull/1271) [`df80f34`](https://github.com/adobe/spectrum-design-data/commit/df80f347baa0a9ae056804232228ae9fe3e55fae) Thanks [@GarthDB](https://github.com/GarthDB)! - Fixes a packaging bug where the `@adobe/design-data-wasm` npm tarball omitted
  the nested `pkg/node/package.json` and `pkg/web/package.json` files. Without
  them, Node's ESM/CJS module-type resolution incorrectly inherited
  `"type": "module"` from the wasm package root, causing every real consumer's
  `import("@adobe/design-data-wasm")` to crash with `ENOENT: no such file or
directory, open './design_data_wasm_bg.wasm'`. The previously published
  `0.4.0` is permanently broken and unusable — this releases a fixed version and
  republishes the two dependents against it.
  - **@adobe/design-data-wasm**: fix the `files` allowlist to include the
    per-target `package.json` manifests.
  - **@adobe/design-data-agent-mcp**: bump `@adobe/design-data-wasm` dependency
    to the fixed version.
  - **@adobe/design-data**: bump `@adobe/design-data-wasm` dependency to the
    fixed version.

## 0.4.0

### Minor Changes

- [#1147](https://github.com/adobe/spectrum-design-data/pull/1147) [`cece05d`](https://github.com/adobe/spectrum-design-data/commit/cece05de03dd8b43cfeb697d045eb4302a34b26c) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix set-level alias resolution in `resolve_reference` after cache reload.
  - **`sdk/core/src/graph.rs`**: add `set_uuid_index` (set_uuid → all children) populated in
    all graph builders and `rebuild_uuid_index`; add `resolve_set_in_context` and
    `resolve_alias_in_context` for context-aware chain walking through set-level UUID aliases.
  - **`sdk/core/src/cascade.rs`**: extract `resolve_reference(graph, slug, ctx)` as a
    testable core function with deterministic tie-breaking and graceful dangling-ref handling.
  - **`sdk/wasm/src/dataset.rs`**: delegate `resolveReference` to the core function;
    remove spike-status comment.
  - **`packages/design-data-spec/conformance/reference/`**: 4 new fixture-driven
    conformance cases (set-alias-light, set-alias-dark, dangling-ref, unknown-slug).
  - **`sdk/wasm/test/parity.test.js`**: 7 new parity tests (wireframe, scale, set-alias
    regression, dangling-ref degradation, stable tie-break).
  - **`docs/s2-tokens-viewer/scripts/resolve.mjs`**: remove JS fallback (now redundant);
    `wasm: 9062 | fallback: 0 | missing: 0`.

## 0.3.0

### Minor Changes

- [#1143](https://github.com/adobe/spectrum-design-data/pull/1143) [`f829426`](https://github.com/adobe/spectrum-design-data/commit/f8294264fdcc5905a8d33dbdde391d8d452597b6) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(sdk): expose Dataset.suggest() on wasm surface; swap MCP suggest to wasm.
  - **sdk/wasm/src/types.rs**: add `SuggestResult` DTO (camelCase tsify) and
    `SuggestResultArray` wrapper; `From<SuggestionResult>` conversion.
  - **sdk/wasm/src/dataset.rs**: add `Dataset.suggest(intent, propertyHint, limit)`
    binding over `design_data_core::suggest::suggest` — Jaccard scoring in-process,
    no full token allocation on the JS side.
  - **tools/design-data-mcp**: replace `ds.query("") + scoreTokensByKeyword` with
    `ds.suggest(intent, undefined, limit)`; remove dead `scoreTokensByKeyword` export.
    Output shape changes to the richer Rust shape (`tokenName`, `file`, `layer`,
    `nameObject`, `value`, `confidence`, `tokenUuid`).

## 0.2.0

### Minor Changes

- [#1141](https://github.com/adobe/spectrum-design-data/pull/1141) [`87f07af`](https://github.com/adobe/spectrum-design-data/commit/87f07af51cfdaa80788e943cd948232d78e6cfd7) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(sdk): expose Dataset.suggest() on wasm surface; swap MCP suggest to wasm.
  - **sdk/wasm/src/types.rs**: add `SuggestResult` DTO (camelCase tsify) and
    `SuggestResultArray` wrapper; `From<SuggestionResult>` conversion.
  - **sdk/wasm/src/dataset.rs**: add `Dataset.suggest(intent, propertyHint, limit)`
    binding over `design_data_core::suggest::suggest` — Jaccard scoring in-process,
    no full token allocation on the JS side.
  - **tools/design-data-mcp**: replace `ds.query("") + scoreTokensByKeyword` with
    `ds.suggest(intent, undefined, limit)`; remove dead `scoreTokensByKeyword` export.
    Output shape changes to the richer Rust shape (`tokenName`, `file`, `layer`,
    `nameObject`, `value`, `confidence`, `tokenUuid`).

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
