---
"figma-spec-plugin": patch
---

Draw what the renderer draws and the plugin skipped: `ring` parts (the focus ring and the
swatch selection band) as stroke-only rectangles on the stroke's center line, `strokeOpacity`
on box and ring strokes, and a text `underline` as a line under the label. Before this a
spec sheet had no focus ring.
