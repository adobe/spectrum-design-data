---
"@adobe/design-data-wasm": patch
---

Clarify that component query filters are accepted for compatibility but are not
indexed in the embedded dataset.

- **sdk/core/src/query.rs**: exclude the unreliable component field from the
  canonical indexed-filter list.
- **sdk/wasm/src/dataset.rs**: direct component discovery to component
  descriptions and token binding metadata.
