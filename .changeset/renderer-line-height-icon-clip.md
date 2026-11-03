---
"@adobe/design-data-wasm": patch
---

Two visual renderer fixes.

- **lineHeight**: a value that does not parse (`128%`, `1.2em`) is a render diagnostic,
  not a silent fallback to 1.3 x font size.
- **icon height**: an icon taller than the label line adds only the line height to a row with
  block padding, as in Figma. button-ios Large is 55.04 high (was 55.67; Figma 55).
