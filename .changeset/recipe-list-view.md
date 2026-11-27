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
- The `description` anatomy part is present only when `description` is set.
- Row background and label color records pin state and selection; the
  vertical padding records pin the scale; the hover, down and focus
  background records now scope to `list-item`.
- Not drawn yet: checkbox, drag handle, actions, section header,
  container border and background, emphasized and dragged rows,
  text truncation.
