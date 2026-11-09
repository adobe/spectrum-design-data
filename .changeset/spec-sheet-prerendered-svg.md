---
"@adobe/design-data-spec": minor
---

Add an optional `render.svg` string to the component spec-sheet schema.

`design-data spec-sheet --svg` writes each block's visual as SVG (the same
renderer as `design-data render`) next to its scene, so a view can draw the
visual without a renderer of its own. Sheets written without `--svg` are
unchanged.
