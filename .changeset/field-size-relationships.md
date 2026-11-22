---
"@adobe/spectrum-design-data": minor
---

Bind search-field container width and text-area field height through relationships for every size.

- search-field width binds the `field-default-width-*` tokens for s, m, l and xl (192, 208, 224, 240 desktop; 240, 256, 272, 288 mobile). The recipe's `size == m` condition is gone. Size m now draws 208 instead of 192.
- text-area field `minimum-height` binds the `base-height-*` tokens (24, 32, 40, 48 desktop; 30, 40, 50, 60 mobile). Size l now draws 40 instead of 56. The recipe's `size == l` condition is gone.
- text-area size s gains the top and bottom edge to text spacing (4px, `base-padding-vertical-small`), and the recipe's block padding covers s.
- Render snapshots and goldens for both recipes are regenerated. Legacy token output is unchanged.
