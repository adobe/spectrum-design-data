---
"@adobe/design-data-spec": minor
---

Add a `shadow` property to component visual recipes: a box can draw one or more drop shadows (`x`, `y`, `blur`, optional `spread`, `color`), each field a value source, so a recipe can bind the `drop-shadow` tokens. Blur is the Figma radius (Gaussian sigma is half of it); the shadow is not drawn inside the box and does not move layout.
