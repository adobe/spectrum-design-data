---
"@adobe/spectrum-design-data": minor
---

Color handle and color loupe: first visual recipes.

- The handle draws a 16px circle (32px on keyboard focus, 20 and 40px on mobile) with the sampled
  `color` over an opacity checkerboard, a 2px white ring, a dark outer border and a disabled look.
  The loupe draws its sampled color over the checkerboard with a 2px white border and a 1px inner
  border. Both are drawn in light, dark and wireframe, on desktop and mobile.
- Sizes, colors and border widths come from the relationships. The border width records of both
  components now carry `attribute: border`, like the swatch, so the outer and inner position pins
  select the right width.
- Not drawn yet: the loupe above the handle (`isOpen`) and its offset, the teardrop shape of the
  loupe (drawn as a rounded box), the loupe drop shadow, the handle inner border over the fill,
  the handle drop shadow.
