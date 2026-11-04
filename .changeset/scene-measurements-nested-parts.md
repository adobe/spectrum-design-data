---
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

feat(sdk): scene measurements for nested parts, border, focus ring and press ratio (qkj5.93)

- **core::visual**: the scene adds `width`, `height`, `radius` and `padding` measurements for
  nested parts, `border` for stroke widths, `focus-thickness` and `focus-gap` for the ring, and
  `press` for the press ratio. Each carries its token and relationship. Existing measurements
  and the SVG output are unchanged.
- **design-data spec-sheet**: Layout blocks render in the states and options their bindings need
  (a focus ring in `keyboard-focus`, a pressed scale in `down`), so the scene shows the part
  the block documents. Measurements show on the Layout page only.
- **component-spec-sheet.schema.json**: the `measurements` description lists the new kinds.
