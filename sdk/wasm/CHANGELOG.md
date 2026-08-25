# @adobe/design-data-wasm

## 0.5.0

### Minor Changes

- [#1365](https://github.com/adobe/spectrum-design-data/pull/1365) [`a7d3693`](https://github.com/adobe/spectrum-design-data/commit/a7d369357d997fa3f678225a220d26e5cb7f81ee) Thanks [@GarthDB](https://github.com/GarthDB)! - Enforce cascade type-safety on manifest overrides targeting alias-only tokens.
  - **sdk/core/src/graph.rs**: `resolve_override_targets` now resolves the shadowed
    token's value through its alias chain (`TokenRecord::resolve_leaf`) instead of
    only reading a literal `value`, so an override that changes a `$ref`-aliased
    token's value type (e.g. color → dimension) is rejected like the existing
    literal-value case, instead of silently applying.

- [#1367](https://github.com/adobe/spectrum-design-data/pull/1367) [`fdff7f5`](https://github.com/adobe/spectrum-design-data/commit/fdff7f5af05b19e61ecb6d20c87df0b77445109b) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a standalone `validate-manifest` CLI subcommand (closes bead spectrum-design-data-h890.5).
  - **sdk/cli/src/main.rs**: new `validate-manifest [PATH] [--manifest FILE] [--format]`
    subcommand — validates a configured Layer 2 platform manifest (Layer 1 schema shape +
    apply-time cascade checks) with CI-friendly exit codes, without running a query.
  - **sdk/core/src/data_source/mod.rs**: `CliPathOverrides` gains a `platform_manifest`
    override so the manifest can be supplied on the command line, winning over the
    `.design-data.toml` `manifest` key.

### Patch Changes

- [#1360](https://github.com/adobe/spectrum-design-data/pull/1360) [`4b841f2`](https://github.com/adobe/spectrum-design-data/commit/4b841f2dba5089bd37f96afd6c22d98c93401f62) Thanks [@GarthDB](https://github.com/GarthDB)! - Load tokens from the resolved `[source]` for `query`/`resolve`/legacy-output-cascaded (h890.19).
  - **sdk/cli/src/main.rs**: `run_query`, `run_resolve`, and
    `run_migrate_legacy_output_cascaded` now load the dataset from
    `resolved.tokens_root` (an explicit PATH argument still wins) instead of always
    reading the raw CWD, so a `.design-data.toml` `[source]` block actually takes
    effect — matching the pattern already used by `run_primer`/`run_cache_build`.

- [#1366](https://github.com/adobe/spectrum-design-data/pull/1366) [`30a282c`](https://github.com/adobe/spectrum-design-data/commit/30a282c7c6493188cc6370e20be5eb3bd783048c) Thanks [@GarthDB](https://github.com/GarthDB)! - Ship spec schemas in the GitHub tarball so manifest Layer-1 validation runs (closes bead h890.4).
  - **sdk/core/src/data_source/fetch.rs**: `should_extract` now retains
    `packages/design-data-spec/schemas/**`, which was previously dropped during
    tarball extraction of a fetched foundation.
  - **sdk/core/src/manifest.rs**: `apply_configured` now errors when a platform
    manifest is configured but `manifest.schema.json` cannot be located, instead of
    silently skipping Layer 1 validation.
  - **sdk/core/src/data_source/embedded.rs**: the embedded fallback snapshot (used
    outside a monorepo checkout, with no fetched or local source) now also bakes in
    `manifest.schema.json`, so the new guard above doesn't newly break that path.

- [#1363](https://github.com/adobe/spectrum-design-data/pull/1363) [`01e7a9c`](https://github.com/adobe/spectrum-design-data/commit/01e7a9cce239d42167dc88fdc998c3a87413c1dd) Thanks [@GarthDB](https://github.com/GarthDB)! - Load tokens from the resolved `[source]` for `validate`/`dump-legacy-keys` (h890.20).
  - **sdk/cli/src/main.rs**: `run_validate` and `run_dump_legacy_keys` now load the
    dataset from `resolved.tokens_root` (an explicit PATH argument still wins)
    instead of always reading the raw CWD, so a `.design-data.toml` `[source]`
    block actually takes effect — matching the pattern already used by
    `run_query`/`run_resolve`/`run_migrate_legacy_output_cascaded` (h890.19).

## 0.4.5

### Patch Changes

- [#1358](https://github.com/adobe/spectrum-design-data/pull/1358) [`46a5a8b`](https://github.com/adobe/spectrum-design-data/commit/46a5a8baf54063697b476c90196adf186231654b) Thanks [@GarthDB](https://github.com/GarthDB)! - Expose legacy-name decomposition for platform-manifest tooling (closes h890.8).
  - **sdk/cli/src/main.rs**: new `decompose-legacy-name` subcommand (exposes
    `naming::parse_legacy_name`/`roundtrips`) and `dump-legacy-keys` subcommand
    (exposes `naming::extract_legacy_key` per token, undeduped) so external
    importers can resolve legacy slugs without reimplementing the algorithm.

- [#1358](https://github.com/adobe/spectrum-design-data/pull/1358) [`46a5a8b`](https://github.com/adobe/spectrum-design-data/commit/46a5a8baf54063697b476c90196adf186231654b) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `migrate legacy-output-cascaded` for feeding classic-schema consumers (e.g. iOS
  tokentool) from a manifest-resolved dataset (h890.10).
  - **sdk/core/src/graph.rs**: `apply_platform_manifest` overrides now replace the
    targeted Foundation-layer record in place instead of shadowing it under a
    synthetic key, so every graph consumer (not just this new command) sees one
    deterministic record per token.
  - **sdk/cli/src/main.rs**: new `migrate legacy-output-cascaded [PATH] --output FILE`
    applies the configured platform manifest cascade before converting to legacy
    schema.
  - **sdk/core/src/legacy.rs**: new `convert_records` entry point converts an
    already-cascaded in-memory array; `build_mode_entry`'s `$schema` fallback for
    schema-less override records now matches alias-ness instead of copying an
    unrelated sibling's schema, and no longer matches the token being processed.

- [#1356](https://github.com/adobe/spectrum-design-data/pull/1356) [`33225fb`](https://github.com/adobe/spectrum-design-data/commit/33225fb76a313247bcd054a6ef21eb6dbeb7ebbc) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix manifest overrides silently no-oping when targeted by a token's legacy slug.
  - **sdk/core/src/graph.rs**: `resolve_override_targets` now resolves non-query
    `target` values through `resolve_alias_key` (uuid → graph key → legacy-name
    index) instead of a partial uuid/direct-key-only lookup, so overrides written
    against legacy names (e.g. `blue-100`) actually apply.

## 0.4.4

### Patch Changes

- [#1285](https://github.com/adobe/spectrum-design-data/pull/1285) [`7652ef9`](https://github.com/adobe/spectrum-design-data/commit/7652ef92131342c3c2b8c3c1f3371f31ddc62fa8) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix `nameObject`/`raw`/`value` serializing as a JS `Map`, rendered as `{}` by
  `JSON.stringify`.
  - **sdk/wasm/src/types.rs**: added `#[tsify(hashmap_as_object)]` to the
    wasm-boundary result types so nested JSON fields cross as plain objects.

## 0.4.3

### Patch Changes

- [#1284](https://github.com/adobe/spectrum-design-data/pull/1284) [`6acda22`](https://github.com/adobe/spectrum-design-data/commit/6acda2204f29884a09760076357ddd89954889f5) Thanks [@GarthDB](https://github.com/GarthDB)! - Fixed `Dataset.suggest()` returning raw `"<file>:<index>"` graph keys as
  `tokenName` for cascade-format tokens instead of the readable legacy name,
  since it skipped the `display_name()` derivation every other surface (diff,
  TUI wizard) already uses.
  - **sdk/wasm/src/types.rs**: `SuggestResult::from` now derives `token_name`
    via `SuggestionResult::display_name()`.

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
