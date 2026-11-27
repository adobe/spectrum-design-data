---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Draw the list-view checkbox and give the focused row a focus ring.

- The `checkbox` anatomy part is present when `selectionMode` is `multiple`, as in menu. Each
  row draws the checkbox recipe (checked when selected, dimmed when disabled) before the icon
  and label. In single or no selection nothing is drawn and the row does not shift.
- `selectionMode` now drives the drawing, so it leaves `notVisual`.
- The `keyboard-focus` state draws the `focus-indicator` ring around each row from the
  focus-indicator color, thickness and gap records. It replaces the row stroke workaround.
- Not drawn yet: drag handle, actions, section header, emphasized and dragged rows, the
  per-item `hideCheckbox` flag.
