---
"@adobe/design-data": patch
---

perf(validate): single-pass token read in validateDataset.

- **tools/design-data/src/validate.js**: accumulate parsed tokens during the Layer-1
  JSON-Schema loop and reuse them for the Layer-2 wasm Dataset — eliminates the
  second `walkTokenFiles` + `readFileSync` pass that `loadDataset` previously triggered.
- **tools/design-data/src/load.js**: export new `buildDataset(tokens)` helper
  (`Dataset.fromTokens` wrapper) for callers that have already parsed token data.
