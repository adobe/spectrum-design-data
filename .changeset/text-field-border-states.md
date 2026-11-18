---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Give the color relationships of text field, number field, text area, search field, combo box
and picker a state, matching the Figma Web POC (Medium, Field stroke).

- **Border:** default `gray-300`, hover `gray-400`, focus + hover `gray-900`, focus (not hover)
  `gray-800`. These were five grays with no state, so the state of each could not be read.
- **Background:** `gray-25` is now its own `Background` context, not `Background and border`.
- **Error:** the `negative-border-color-*` records get hover, focus + hover, focus and
  keyboard-focus.
- **Disabled:** new `disabled-border-color` record where missing, pinned to `isDisabled` and not
  `isError`.
- **Differences:** combo box uses its own state names (`hover-text-area`, `focus-hover`,
  `focus-not-hover`); picker only gets states on its error records; number field's keyboard-focus
  error record stays without a state because the component does not declare that state.

No record changes its `uuid` or `$ref`, and none of these components has a visual recipe, so
nothing renders differently.
