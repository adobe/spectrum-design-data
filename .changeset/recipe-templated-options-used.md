---
"@adobe/design-data-wasm": patch
---

A recipe selector with an `{option}` placeholder now counts that option as used. Patch: no WASM API
changes; only the options the recipe-coverage validation requests change, and validation output on
the current dataset is identical.
