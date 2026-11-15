---
"@adobe/spectrum-design-data": patch
---

Move the `isMultiline` qualifier out of 11 `breadcrumbs` relationship contexts and into
`scope.options` (rule SPEC-093). `Spacing (top and bottom edge to text, multiline)` becomes
`Spacing (top and bottom edge to text)` with `isMultiline: true` pinned, next to the existing
unpinned default record of the same context, and the same for the other `Spacing` and `Text`
multiline contexts. The `(medium)` contexts and `(hover, down, focus states)` are unchanged.
`breadcrumbs` has no visual recipe, so nothing renders differently.
