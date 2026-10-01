---
"@adobe/design-data-wasm": patch
---

Build and verify wasm artifacts before snapshot and stable publication.

- **sdk/wasm**: check packed artifacts and isolated Node and web runtimes.
- **release workflows**: build snapshot wasm separately and verify packages before publishing.
