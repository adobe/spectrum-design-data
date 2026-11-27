---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add the visual recipe for list-view.

- One row per `items` entry: selected, unselected and disabled rows,
  an optional description line and the navigation chevron.
- First and last rows round their outer corners; the selected row gets
  the accent border; the focus state draws the focus outline.
- New `isSelected`, `isDisabled` and `description` options, and the
  `hover`, `down`, `default` and `selected` states.
- Row background, label and padding records pin state, selection and
  scale; the background records reference their color tokens (not
  stack-item records) and scope to `list-item`, so selected and
  hovered rows draw a subtle fill.
- A disabled row only dims; it has no fill of its own.
- Not drawn yet: checkbox, drag handle, actions, section header,
  container border and background, emphasized and dragged rows,
  text truncation.
