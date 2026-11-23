---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add visual recipes for side-navigation and stack-item.

- Side navigation draws a heading and items (selected, unselected, disabled) through the relationships.
- New `sectionTitle` option on side-navigation; the selection indicator is present only when `isSelected`.
- The selection-indicator color records now pin `isSelected` (gray-800 selected, gray-400 not).
- Stack item gets `isSelected`, `isDisabled`, `hasCheckbox`, `visual` options and an `actions` slot.
- Stack item nests checkbox and thumbnail recipes; new live relationships for padding, gap and label color.
- Not drawn yet: indent levels, hover bar, focus ring, description, drag handle, chevron, trailing accessory.
