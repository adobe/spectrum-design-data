# @adobe/design-data-cli

## 0.7.0

### Minor Changes

- [#1085](https://github.com/adobe/spectrum-design-data/pull/1085) [`14d4db4`](https://github.com/adobe/spectrum-design-data/commit/14d4db4781ce7a0807240878802a75beec47c702) Thanks [@GarthDB](https://github.com/GarthDB)! - Emit the structured `name` object from the TUI authoring wizard for MCP parity (closes #1082).
  - **sdk/core/authoring/draft**: add shared `build_name_object` next to `build_value_fields`.
  - **sdk/core/authoring/session**: delegate `name`-object assembly to the shared helper.
  - **sdk/tui/wizard**: include `name` in `base_token_map` so writes and Confirm diff match MCP shape.
  - **sdk/tui/tests/write**: assert `name.property` and name fields land on disk with a
    real schema registry.

## 0.6.0

### Minor Changes

- [#1083](https://github.com/adobe/spectrum-design-data/pull/1083) [`dcf3f2d`](https://github.com/adobe/spectrum-design-data/commit/dcf3f2da92b3fc3d6d9037b40fdb64eea44edba2) Thanks [@GarthDB](https://github.com/GarthDB)! - Make the TUI `/` fuzzy-find palette filter token names live instead of being a
  no-op (closes #1079).
  - **sdk/tui/src/fuzzy.rs**: new fzf-style `subsequence_score` + `rank_token_rows`
    (case-insensitive, consecutive-run and word-boundary bonuses).
  - **sdk/tui/src/update.rs**: `/` seeds an all-tokens results table and stashes the
    prior view; each keystroke re-ranks live; Enter commits, Esc restores.
  - **sdk/tui/src/mode.rs**: `PaletteState` gains `saved_view` for Esc restore.
  - **sdk/tui/src/runtime.rs**: only Command-mode Enter dispatches `PaletteSubmit`,
    so fuzzy input never hits the command router.
  - **sdk/tui/src/update_command.rs**: drop the now-unreachable fuzzy early-return.

- [#1081](https://github.com/adobe/spectrum-design-data/pull/1081) [`bb6e828`](https://github.com/adobe/spectrum-design-data/commit/bb6e828e92848b94d125c96ec233137c87ea5773) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix the TUI authoring wizard dropping all but the first mode-combo row on write.
  - **sdk/core/authoring/draft**: add shared `build_value_fields` that emits flat
    `$ref`/`value` for a single default row and nested `sets` for multi-mode rows.
  - **sdk/core/authoring/session**: delegate token-value assembly to the shared helper.
  - **sdk/tui/wizard**: build the written token and the live diff from one
    `assembled_token` source (every value row, canonical `$ref` not `$alias`), so the
    Confirm diff matches exactly what lands on disk.
  - **sdk/tui/tests/wizard**: add a structured regression test asserting the assembled
    token serializes `sets.light`/`sets.dark` for multi-mode rows.
  - **sdk/tui/DEMO.md**: correct Beat B3 to use `:query`/`:find`; note `/` fuzzy-find
    is not yet wired.

## 0.5.0

### Minor Changes

- [#1074](https://github.com/adobe/spectrum-design-data/pull/1074) [`255c8e4`](https://github.com/adobe/spectrum-design-data/commit/255c8e44d41ed6abf67f1c877da1909c7cf09718) Thanks [@GarthDB](https://github.com/GarthDB)! - Make validation catalog-aware so inline mode sets are preserved when a mode-sets
  catalog is passed (closes spectrum-design-data-ydg).
  - **sdk/core/src/graph.rs**: add `from_json_dir_with_names_and_catalogs` (sidecar
    names + catalog extend); `from_json_dir_with_catalogs` now delegates to it.
  - **sdk/core/src/validate/mod.rs**: `validate_all_with_options_and_names` extends
    (no longer replaces) `mode_sets`, so inline mode-set docs co-located in the
    token tree are seen by SPEC-005/008/041 alongside catalog mode sets.

## 0.4.0

### Minor Changes

- [#1073](https://github.com/adobe/spectrum-design-data/pull/1073) [`687db7b`](https://github.com/adobe/spectrum-design-data/commit/687db7b2d8556aac7404868d5fc36dba4f1724f7) Thanks [@GarthDB](https://github.com/GarthDB)! - Extend the embedded-database cache to schema v2: persist inline mode-sets and
  spec catalog tables (closes spectrum-design-data-opm).
  - **sdk/core/src/cache/mod.rs**: bump `CACHE_SCHEMA_VERSION` to 2; add
    `mode_sets`/`components` redb tables; catalog-aware `*_with_catalogs` APIs.
  - **sdk/core/src/graph.rs**: `from_json_dir_with_catalogs` and catalog-aware
    `open_cached_*` wrappers.
  - **sdk/cli/src/main.rs**: `cache-build` gains `--mode-sets-path` /
    `--components-path`; query/resolve/primer use catalog-aware cache.
  - **sdk/tui/src/app_launch.rs**: session load hydrates catalogs from cache.
  - **sdk/README.md**: document schema v2 tables and new cache-build flags.

## 0.3.0

### Minor Changes

- [#1070](https://github.com/adobe/spectrum-design-data/pull/1070) [`54db5eb`](https://github.com/adobe/spectrum-design-data/commit/54db5eb8127257916553e3ca7c234e02d1121951) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix npm release so platform binary packages publish in lockstep with the launcher.
  - **.changeset/config.json**: add a `fixed` group locking `@adobe/design-data` and the four
    `@adobe/design-data-{darwin-arm64,darwin-x64,linux-x64,win32-x64}` packages so they always
    version and publish together.
  - **.github/workflows/release.yml**: run `pnpm run version` (was `pnpm changeset version`) so the
    Moon step syncs the bumped version into the cli/tui `Cargo.toml` files, and add a pre-publish
    guard that aborts if any platform package version drifts from the CLI.
  - This ships the 0.2.x binaries (embedded DB cache, shared manifest resolution) that the 0.2.0
    launcher referenced but never published.

## 0.2.0

### Minor Changes

- [#1069](https://github.com/adobe/spectrum-design-data/pull/1069) [`9b8425c`](https://github.com/adobe/spectrum-design-data/commit/9b8425c99548ee3385ebe6cc864f79459932745f) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a derived embedded-database cache (redb) over the canonical token JSON so the
  CLI/TUI skip re-parsing JSON each run and gain indexed queries (spectrum-design-data-15a).
  - **sdk/core `cache`**: new module behind a default-on `cache` feature; a
    content-addressed redb DB (MessagePack values) with `tokens`/`uuid_index`/per-field
    `idx_*` multimap tables, written atomically and namespaced by tokens version.
  - **sdk/core `graph.rs`**: `TokenGraph::open_cached` is a drop-in for `from_json_dir` —
    hits a fresh cache, rebuilds on miss, falls back to JSON on any error (never load-bearing).
  - **sdk/core `query.rs`**: `TokenIndex` + `filter_with_index` add an index-backed fast path
    for single-field equality (lands #783); the in-memory scan stays the fallback.
  - **sdk/core `cache::mem_backend`**: in-memory redb backend plus
    `build_bytes`/`load_from_bytes`/`load_index_from_bytes` for read-only WASM web tools.
  - **sdk/cli**: `query`/`resolve`/`diff`/`primer`/`suggest` load via the cache; new
    `cache-build` subcommand emits a portable `index.redb` asset.
  - **deps**: add `redb` (pinned 2.6.x for MSRV 1.85) and `rmp-serde`.

- [#1067](https://github.com/adobe/spectrum-design-data/pull/1067) [`fc8fb41`](https://github.com/adobe/spectrum-design-data/commit/fc8fb418ca69c4606c3c5165e7e1fa9f74cf1de8) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the Foundation→Platform manifest cascade to the data-source resolver (closes #1053).
  - **sdk/core `graph.rs`**: new `TokenGraph::apply_platform_manifest` applies a
    platform manifest's `include`/`exclude` query filters, type-preserving
    `overrides`, `extensions.tokens`, and returns `modeSetRestrictions`.
  - **sdk/core `schema.rs`**: new `SchemaRegistry::validate_manifest` performs Layer 1
    validation against `manifest.schema.json`.
  - **sdk/core `data_source`**: `[source].manifest` config field and
    `ResolvedData.platform_manifest` carry the platform manifest path.
  - **sdk/cli**: `query` and `resolve` now apply a configured platform manifest
    (schema-validated) and feed mode-set restrictions into resolution.

- [#1069](https://github.com/adobe/spectrum-design-data/pull/1069) [`9b8425c`](https://github.com/adobe/spectrum-design-data/commit/9b8425c99548ee3385ebe6cc864f79459932745f) Thanks [@GarthDB](https://github.com/GarthDB)! - Share platform manifest application and property resolution between CLI and TUI.
  - **sdk/core `manifest.rs`**: new `apply_configured` reads/validates `[source].manifest`
    and applies the platform cascade.
  - **sdk/core `cascade.rs`**: new `resolve_property` + `ResolvedCandidate` unify
    property-scoped resolution.
  - **sdk/cli**: `query`/`resolve` call shared core helpers; duplicate manifest helpers removed.
  - **sdk/tui**: manifest at session load, `mode_set_restrictions` on `UpdateCtx`, `:resolve`
    uses `resolve_property`.

## 0.1.3

### Patch Changes

- [`17085f6`](https://github.com/adobe/spectrum-design-data/commit/17085f66637f342f0baf184a7d9bb29cfc8206c5) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix CI release workflow: run `sdk:codegen` on all platforms to avoid a
  Windows CRLF line-ending mismatch in `codegen-check`.

## 0.1.2

### Patch Changes

- first release of new packages.

## 0.1.1

### Patch Changes

- [#870](https://github.com/adobe/spectrum-design-data/pull/870) [`3af42f3`](https://github.com/adobe/spectrum-design-data/commit/3af42f383262589e808c6807e557c7bfd09e632b) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(cli): add `design-data primer` subcommand for agent session start

- [#871](https://github.com/adobe/spectrum-design-data/pull/871) [`19698b4`](https://github.com/adobe/spectrum-design-data/commit/19698b45b692f25b71d0ea13ff19af8ab209c73d) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(cli): add `design-data component <ID>` subcommand for agent component lookup
