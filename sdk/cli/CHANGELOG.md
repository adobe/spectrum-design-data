# @adobe/design-data-cli

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
