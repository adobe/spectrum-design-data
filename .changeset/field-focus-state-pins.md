---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Fix the focus states of text-field, number-field, text-area, search-field and picker.
Keyboard-focus and focus + hover borders now match Figma.

- The focus records pinned the composite states `focus-+-hover` and `focus-+-not-hover`,
  which no render ever activates. They now pin `["focus", "hover"]` and `["focus"]`
  (AND-state pins), and the components declare `focus` instead of the composite states.
- Keyboard focus draws the gray-800 border (was gray-300); keyboard focus + hover draws
  gray-900 (was gray-400); error + keyboard focus + hover draws negative/focus-hover
  (was negative/hover). Default, hover, error, error + hover and disabled are unchanged.
- The unpinned `key-focus` border and value records that duplicated the focus records are
  removed, so keyboard-focus renders no longer report `ambiguous: 2 candidates remain`.
- The legacy `@adobe/spectrum-tokens` output is unchanged.
