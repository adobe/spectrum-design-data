---
"@adobe/design-data": minor
---

Add a derived embedded-database cache (redb) over the canonical token JSON so the
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
