---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

Add the opacity-checkerboard visual recipe, with the renderer features it needs.

- New box props `patternFill` and `patternSize`: a box draws a checkerboard of squares of
  `patternSize` in its `fill` and `patternFill`, `fill` at the top-left, clipped to its corners.
  SVG uses a `<pattern>`, PNG draws the squares. Scene nodes carry a `pattern` field.
- New value source `{"dimension": "<name>"}`: a size in pixels the request carries in a numeric
  option, for an extent no token holds. An invalid value is dropped with a diagnostic.
- Relationship-owned alias tokens (a `$ref` and no `context`) now resolve, so a relationship
  can bind the checkerboard colors, which alias palette tokens.
- opacity-checkerboard declares a `size` option (`s`, `m`, default `m`) that its square size
  relationships already pinned, and defaults for `verticalSize` (16) and `horizontalSize` (24).
  Anatomy is still draft until reviewed.
