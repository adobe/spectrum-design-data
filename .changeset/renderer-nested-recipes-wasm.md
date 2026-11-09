---
"@adobe/design-data-wasm": patch
---

`renderScene` and `renderSvg` draw a recipe's `component` parts (a nested action
button and switch in the accordion item), with namespaced scene parts such as
`action-button.icon`. Renders of recipes without `component` parts are unchanged.
