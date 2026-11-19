---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Give the color relationships of text field, number field, text area, search field, combo box
and picker a state, matching the Figma Web POC (Medium, Field stroke).

- **Border:** default `gray-300`, hover `gray-400`, focus + hover `gray-900`, focus (not hover)
  `gray-800`. These were five grays with no state.
- **Contexts:** `gray-25` is now `Background` (role `background`) and the grays are `Border`
  (role `border`), not `Background and border` with both roles.
- **Error:** the `negative-border-color-*` records get hover, focus + hover, focus and
  keyboard-focus.
- **Disabled:** new `disabled-border-color` record where missing, pinned to `isDisabled` and not
  `isError` (search field has no `isError`, so its record stays pinned to `isDisabled`).
- **Differences:** combo box uses its own state names; picker's error records get states and
  `isQuiet: false` (a quiet picker has no error border in Figma or React Spectrum); number
  field's keyboard-focus error record stays without a state.

No existing `uuid` or `$ref` changes, and none of these components has a visual recipe.
