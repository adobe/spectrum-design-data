---
"@adobe/spectrum-design-data": patch
---

Move the `orientation` and `isSelected` qualifiers out of 29 `select-box` relationship contexts
and into `scope.options` (rule SPEC-093). `Text (horizontal)` and `Text (vertical)` become `Text`
with `orientation` pinned, and `Border (selected)` becomes `Border` with `isSelected: true`
pinned. `orientation` defaults to `vertical`, so the vertical `font-weight` record is the only
unpinned one; every other vertical record keeps `orientation: vertical`, because no horizontal
record covers its property. `select-box` has no visual recipe, so nothing renders differently.
