---
"@adobe/design-data-wasm": patch
---

The renderer now reports a diagnostic when a `relationship` or `token` selector
still matches more than one token after narrowing by mode and options, naming
the part, the selector and the candidate count. It still renders, using the
first candidate. Previously the pick was silent. No foundation recipe is
affected for the `light`, `dark` and `wireframe` colour schemes.
