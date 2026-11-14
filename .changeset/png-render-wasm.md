---
"@adobe/design-data-wasm": minor
---

Render components to PNG, and pick the text font from descriptors.

- **`Dataset.renderComponentPng(request, fonts, options)`**: returns `{ png, diagnostics }`.
  A font not marked `fallback` also sets the layout text widths, so boxes fit their text.
  `options` takes `pixelRatio` and `background`.
- **`describeFont` and `chooseFont`**: WebAssembly cannot read the disk, so a caller reads each
  font's `name` table, describes it, and lets `chooseFont` pick Adobe Clean Spectrum VF with
  the same rules and wording as the `design-data` CLI.
- The slim `@adobe/design-data-wasm-visual` build is unchanged and has no rasterizer.
