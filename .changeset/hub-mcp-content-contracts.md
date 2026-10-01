---
"@adobe/design-data-wasm": patch
---

Keep embedded Hub guidance current when guideline files change.

- **sdk/core/build.rs**: invalidate Cargo's embedded snapshot when guidelines change.
- **sdk/wasm/moon.yml**: include guideline content and the core build script in WASM build inputs.
