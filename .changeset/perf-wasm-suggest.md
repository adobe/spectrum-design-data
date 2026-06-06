---
"@adobe/design-data-wasm": minor
"@adobe/design-data-mcp": minor
---

feat(sdk): expose Dataset.suggest() on wasm surface; swap MCP suggest to wasm.

- **sdk/wasm/src/types.rs**: add `SuggestResult` DTO (camelCase tsify) and
  `SuggestResultArray` wrapper; `From<SuggestionResult>` conversion.
- **sdk/wasm/src/dataset.rs**: add `Dataset.suggest(intent, propertyHint, limit)`
  binding over `design_data_core::suggest::suggest` — Jaccard scoring in-process,
  no full token allocation on the JS side.
- **tools/design-data-mcp**: replace `ds.query("") + scoreTokensByKeyword` with
  `ds.suggest(intent, undefined, limit)`; remove dead `scoreTokensByKeyword` export.
  Output shape changes to the richer Rust shape (`tokenName`, `file`, `layer`,
  `nameObject`, `value`, `confidence`, `tokenUuid`).
