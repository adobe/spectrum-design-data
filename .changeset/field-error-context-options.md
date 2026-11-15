---
"@adobe/spectrum-design-data": patch
---

Move the `isError` qualifier out of 26 `Border (error)` relationship contexts in `picker`,
`combo-box`, `number-field`, `text-area` and `text-field`, and into `scope.options` (rule
SPEC-093). Each becomes `Border` with `isError: true` pinned. The plain `Border` records use a
different property (`border-width`), so no unpinned `color` record exists and a field without an
error has no `Border` color binding, as before. None of these components has a visual recipe, so
nothing renders differently.
