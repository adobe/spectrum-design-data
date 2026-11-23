---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add visual recipes for side-navigation and stack-item.

- Side navigation draws a heading and selected, unselected and disabled items.
- New `sectionTitle` option; the selection indicator shows only when `isSelected`.
- Selection-indicator color records now pin `isSelected` (gray-800 or gray-400).
- Stack item gets `isSelected`, `isDisabled`, `hasCheckbox`, `visual` and an `actions` slot.
- Stack item nests checkbox and thumbnail; new live padding, gap and label color records.
- Not drawn yet: indent levels, hover bar, focus ring, description, drag handle, chevron.
