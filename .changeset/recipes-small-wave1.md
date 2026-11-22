---
"@adobe/spectrum-design-data": minor
---

In-field button, coach indicator, standard panel and bar panel: first visual recipes.

- In-field button draws a square (16, 20, 24 or 32 px) with a gray-100 fill, a gray-200 hover
  fill, a disabled look and a content icon.
  The component gains `size`, `isDisabled` and the `hover` state.
  Its four stacked-width records now use the sizes `s`, `m`, `l` and `xl`.
- Coach indicator draws a static frame of the ring: 4 px and full strength collapsed, 8 px and 20%
  expanded, white or the default color, around a target with any `cornerRounding`.
- Standard panel draws the gripper, title, nested close button and divider, and an accordion in
  its slot, in primary and secondary style, three densities and the anchored, floating and dragged
  types.
  The anatomy gains `header-area` and `content`, and the content slot accepts an accordion. The
  dragged gripper record is pinned to `type: dragged`.
- Bar panel draws the gripper, action buttons and divider, vertical or horizontal, in five
  densities. The component gains `style`, `density`, `orientation`, `isFloating`, `hideDragHandle`
  and `hideDivider`.
- Not drawn yet: panel drop shadows, the back button, the second ring of the expanded coach
  indicator, the stacked and quiet in-field button, the gripper as an icon (a plain box).
