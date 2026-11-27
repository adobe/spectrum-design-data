---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Draw the list-view checkbox and give the focused row a focus ring.

- The `checkbox` part is present when `selectionMode` is `multiple`, as in menu. Each row draws
  the checkbox recipe (checked when selected, dimmed when disabled) before the icon and label.
  Single or no selection draws nothing. `selectionMode` leaves `notVisual`.
- The `keyboard-focus` state draws the `focus-indicator` ring around each row from the
  focus-indicator color, thickness and gap records, replacing the row stroke workaround.
- Differs or not drawn: a multiple-selection row is 8 px taller than a single one (48 vs 40,
  as in menu); a long label overflows 22 px further than before.
- The description starts under the checkbox, not under the label.
- The checkbox does not follow the hover or down state.
- The ring on the first and last row has radius 3 against a row corner of 8 (the engine ignores
  per-corner radii).
- Keyboard focus is global, so multi-row goldens ring every row.
- Not drawn: per-item `hideCheckbox`, drag handle, actions, section header.
