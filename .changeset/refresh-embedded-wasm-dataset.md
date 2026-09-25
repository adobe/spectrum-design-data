---
"@adobe/design-data-wasm": patch
---

Rebuild the embedded wasm dataset snapshot, stale since 3.1.0, to match published data 3.2.5.

- **sdk/wasm**: rebuilt against current `packages/design-data` source, refreshing
  `embedded_cache.redb` and the `pkg/node`/`pkg/web` outputs; `primer().provenance
  .designDataVersion` now reports `3.2.5`.
