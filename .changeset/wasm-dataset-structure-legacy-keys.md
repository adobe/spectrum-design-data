---
"@adobe/design-data-wasm": patch
---

Rebuild the embedded dataset with the pinned structure-prefixed legacy keys.

- **packages/design-data/tokens/layout.tokens.json**: `name.legacyKey` pins change the
  dataset that `sdk/core` embeds at compile time. Generated output is unchanged.
