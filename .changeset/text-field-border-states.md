---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Give the color relationships of text field, number field, text area, search field, combo box
and picker a state, matching the Figma Web POC (Medium, Field stroke).

- **Border:** default `gray-300`, hover `gray-400`, focus + hover `gray-900`, focus (not hover)
  `gray-800`. These were five grays with no state, so the state of each could not be read.
- **Contexts:** `gray-25` is now `Background` (`contextRole` `background`) and the grays are
  `Border` (`contextRole` `border`), not `Background and border` with both roles. Search field's
  disabled border record moves to `Border` too.
- **Error:** the `negative-border-color-*` records get hover, focus + hover, focus and
  keyboard-focus.
- **Disabled:** new `disabled-border-color` record where missing, pinned to `isDisabled` and not
  `isError`. Search field has no `isError` option, so its existing record stays pinned to
  `isDisabled` only.
- **Differences:** combo box uses its own state names (`hover-text-area`, `focus-hover`,
  `focus-not-hover`). Picker gets states on its error records and a default `gray-300` border
  (constant across states in Figma). Number field's keyboard-focus error record stays without a
  state because the component does not declare it.

No existing record changes its `uuid` or `$ref`, and none of these components has a visual
recipe, so nothing renders differently.
