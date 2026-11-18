---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Give the text-field color relationships a state, matching the Figma Web POC Text field
component (Medium, Field stroke).

- **Border:** default `gray-300`, hover `gray-400`, focus + hover `gray-900`, focus (not hover)
  `gray-800`. These were five grays with no state, so the state of each could not be read.
- **Background:** `gray-25` is now its own `Background` context, not `Background and border`.
- **Error:** the `negative-border-color-*` records get hover, focus + hover, focus and
  keyboard-focus.
- **Disabled:** new record for `disabled-border-color`, pinned to `isDisabled` and not `isError`.

No record changes its `uuid` or `$ref`. Text field has no visual recipe, so nothing renders
differently. Number field, search field, combo box and picker have the same pattern and are
not changed here.
