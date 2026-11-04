---
"@adobe/design-data-wasm": patch
---

fix(sdk): spec sheets are reproducible byte for byte

- **design-data spec-sheet**: `render.request.mode` keys were written in hash-map order, so two runs
  on the same data differed. They are sorted now, which lets a sheet hash tell whether a Figma
  file is stale.
