---
"@adobe/spectrum-design-data": patch
---

Derive `figma diff`'s scale/colorScheme resolution from declared mode-set
schema instead of hardcoded literals (closes spectrum-design-data-11k.16).

- **sdk/core/src/graph.rs**: `rebuild_legacy_name_index`'s desktop/light
  tie-break now reads its defaults from `graph.mode_sets` when declared,
  falling back to the historical `"desktop"`/`"light"` literals otherwise;
  `with_mode_sets` rebuilds the index afterward so attaching mode sets
  after tokens (redb cache hydration, `from_json_dir_with_names_and_catalogs`)
  no longer leaves a stale, schema-unaware index.
- **sdk/plugins/figma/src/import/resolve.rs**: `default_source_context` now
  derives its checked discriminator fields from `graph.mode_sets` instead
  of hardcoding `scale`/`colorScheme`, so a token disambiguated by any
  declared mode set (e.g. `contrast`) keeps its alias-chain context pinned.
- **sdk/cli/src/main.rs**: fixed a stale comment miscounting `figma diff`'s
  pretty-print columns.
