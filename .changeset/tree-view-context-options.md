---
"@adobe/spectrum-design-data": patch
---

Move the `selectionStyle` qualifier out of 18 `tree-view` relationship contexts and into
`scope.options` (rule SPEC-093). `Background (selected, highlight)`, `Border (selected,
highlight)` and `Border width (selected, highlight)` pin `selectionStyle: highlight`;
`Spacing (edge to checkbox, checkbox)` pins `selectionStyle: checkbox`. `checkbox` is the default
style, and the color records of `Background (selected)` are unpinned because a highlight record
covers the other style. `Label and icon (selected, checkbox and highlight)` named both styles,
so it becomes `Label and icon (selected)` with no pin. `tree-view` has no visual recipe, so
nothing renders differently.
