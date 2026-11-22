---
"@adobe/design-data-spec": minor
---

Add a `shadow` property to component visual recipes. A box draws one or more
drop shadows (`x`, `y`, `blur`, optional `spread`, `color`). Each field is a
value source, so a recipe binds the `drop-shadow` tokens. Blur is the Figma
radius (Gaussian sigma is half of it). The shadow is not drawn inside the box
and does not move layout.
