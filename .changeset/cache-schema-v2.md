---
"@adobe/design-data": minor
---

Extend the embedded-database cache to schema v2: persist inline mode-sets and
spec catalog tables (closes spectrum-design-data-opm).

- **sdk/core/src/cache/mod.rs**: bump `CACHE_SCHEMA_VERSION` to 2; add
  `mode_sets`/`components` redb tables; catalog-aware `*_with_catalogs` APIs.
- **sdk/core/src/graph.rs**: `from_json_dir_with_catalogs` and catalog-aware
  `open_cached_*` wrappers.
- **sdk/cli/src/main.rs**: `cache-build` gains `--mode-sets-path` /
  `--components-path`; query/resolve/primer use catalog-aware cache.
- **sdk/tui/src/app_launch.rs**: session load hydrates catalogs from cache.
- **sdk/README.md**: document schema v2 tables and new cache-build flags.
