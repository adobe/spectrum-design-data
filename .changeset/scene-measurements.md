---
"@adobe/design-data-wasm": minor
---

feat(core): the visual scene records token-bound measurements

`design-data render --format scene` and WASM `renderScene` add a `measurements` array.
Each entry is a height, padding, gap or radius span of the layout with its token.
Overlay backends draw dimension lines from it instead of recomputing layout.
Recipes author no overlays. The array is omitted when no dimension is token-bound.
The JS runtime does not emit it yet.
