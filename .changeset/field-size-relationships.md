---
"@adobe/spectrum-design-data": minor
---

Bind search-field width and text-area field height through relationships for every size.

- Adds live field width tokens `width-field-{desktop,mobile}-{75,100,200,300}` (no legacy key).
- search-field width binds them for s, m, l and xl.
  Desktop 192, 208, 224, 240; mobile 240, 256, 272, 288.
  Size m now draws 208 instead of 192.
- text-area `minimum-height` binds `base-height-*` for s, m, l and xl.
  Desktop 24, 32, 40, 48; mobile 30, 40, 50, 60.
  Size l now draws 40 instead of 56.
- text-area size s gains top and bottom edge to text spacing (4px).
- Render snapshots and goldens are regenerated. Legacy token output is unchanged.
