---
"@adobe/spectrum-design-data": minor
---

Tag: first visual recipe.

- The recipe draws a rounded tag with a label, an optional leading icon or avatar and an optional
  clear button, at sizes s, m and l, in light, dark and wireframe, on desktop and mobile.
- States drawn: default, hover, down (label color only), keyboard focus, selected, selected and
  emphasized, and disabled. Fill, height, minimum width, padding, radius, label font and colors and
  the focus ring come from the tag relationships. The avatar and clear button reuse their recipes.
- Data fix: the four selected label color records are now `content-color` (they shared `color`
  with the background and could not be told apart), and the unselected hover and keyboard focus
  background record is split into one record per state (it required both states at once).
- Known limits: the clear button on a selected tag keeps its neutral color, so it is hard to see on
  the dark fill. The label to clear button gap is 12px when there is no avatar, 6px with one.
- Not drawn yet: error look (no records), border, maximum width, avatar image and initials.
