---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add the visual recipe for tree-view, with nested items.

- New `items` collection slot on the `row` part: one tree item per
  entry, each nesting its `children`, up to 6 levels in all.
- A level is its own part (`row-level-1` to `row-level-5`), indented
  by one `level-increment`; the line of an item is `row-content`.
- New `hasChildren`, `isExpanded`, `isSelected`, `isDisabled` and
  `isFocusVisible` options. A nested item that leaves a flag out
  inherits its parent's value, so write `false` to clear it.
- Draws the checkbox, the disclosure chevron (right when collapsed,
  down when expanded), the icon, the label, the selected, hover and
  down background, and a focus ring per item.
- A selected row keeps the gray fill under down and focus, an
  unselected highlight row takes no state fill, and a disabled row
  greys its label and icon even when selected.
- Sizes s, l and xl use size tokens; l and xl have no minimum width.
- Not drawn yet: drag handle, thumbnail, actions, section header,
  detached and emphasized styles.
