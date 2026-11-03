---
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

The visual renderer reads the root part's `direction`, `align` and `justify`.

- **direction**: `row` (default) or `column`. A column is as wide as its widest child.
- **align**: `start`, `center` (default) or `end`, across the layout direction.
- **justify**: `start`, `center` (default) or `end`, along a column with a set height.
  A row is as wide as its content, so `justify` does nothing there.
- Any other value is a render diagnostic and keeps the default.
- SPEC-083 no longer warns about these props; existing recipes render unchanged.
