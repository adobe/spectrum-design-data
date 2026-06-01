---
"@adobe/design-data": minor
---

Switch CLI embedded snapshot to cascade-format `@adobe/spectrum-design-data`.

- **sdk/core/src/data_source/embedded.rs**: Replace `packages/tokens/src` embed
  with `packages/design-data/tokens` (`*.tokens.json`); rename
  `EMBEDDED_TOKENS_VERSION` → `EMBEDDED_DATA_VERSION = "0.1.0"`; update
  materialize layout and drift test to track `packages/design-data/package.json`.
- **sdk/core/src/data_source/mod.rs**: `from_root` sets `tokens_root` to
  `packages/design-data/tokens` so embedded and config-path tiers serve the
  cascade corpus with inline name-object taxonomy.
- **sdk/core/src/cache/mod.rs**: Update `EMBEDDED_DATA_VERSION` import; old
  caches evicted automatically by the new version key.
- **sdk/core/src/data_source/fetch.rs**: `should_extract` now accepts
  `packages/design-data/tokens` paths for future remote fetch sources.
