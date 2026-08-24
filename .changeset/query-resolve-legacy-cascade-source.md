---
"@adobe/design-data-tui": patch
"@adobe/design-data-wasm": patch
---

Load tokens from the resolved `[source]` for `query`/`resolve`/legacy-output-cascaded (h890.19).

- **sdk/cli/src/main.rs**: `run_query`, `run_resolve`, and
  `run_migrate_legacy_output_cascaded` now load the dataset from
  `resolved.tokens_root` (an explicit PATH argument still wins) instead of always
  reading the raw CWD, so a `.design-data.toml` `[source]` block actually takes
  effect — matching the pattern already used by `run_primer`/`run_cache_build`.
