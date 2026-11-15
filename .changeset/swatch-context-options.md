---
"@adobe/spectrum-design-data": patch
---

Move the `shape` and `isSelected` qualifiers out of 16 `swatch` relationship contexts and into
`scope.options` (rule SPEC-093). `Size (square)` becomes `Size` with `shape: square` pinned,
`Width (rectangle)` becomes `Width` with `shape: rectangle` pinned, and `Border and inner border
(selected)` becomes `Border and inner border` with `isSelected: true` pinned. `square` is the
default shape, but no `Width` or `Size` record for the other shape shares its property, so the
square pin stays. The structured `contextPart` field is dropped with the qualifier it held.
`swatch` has no visual recipe, so nothing renders differently.
