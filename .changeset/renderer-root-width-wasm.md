---
"@adobe/design-data-wasm": minor
---

`renderScene` and `renderSvg` accept an optional `width` (px) in the request:
the demo width of the root. It overrides the recipe's root `width` and never
goes below its `minWidth`.
