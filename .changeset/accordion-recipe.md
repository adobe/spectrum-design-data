---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

feat(design-data): accordion item visual recipe and row boxes in the renderer

Adds the accordion item recipe (sizes s to xl, density, quiet, open, hover, disabled).
It needs three renderer features, in both the Rust solver and the JS runtime:

- A flowed box that binds `direction: "row"` lays out icon, text and box children in a row.
- A column root stretches a box with no width across its width.
- An icon can bind `rotation`, and the `chevron` glyph is new.

A relationship that pins `size`, or binds a single token, no longer loses that token to the
token's own size name. A templated numeric selector field (`{sizeIndex}`) now matches a number.
