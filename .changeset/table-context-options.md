---
"@adobe/spectrum-design-data": patch
---

Move the `density` qualifier out of 22 `table` relationship contexts and into `scope.options`
(rule SPEC-093). `Row height (minimum, compact density)` and `(minimum, spacious density)` become
`Row height (minimum)` with `density` pinned, and `Spacing (row top/bottom to text, compact
density)` and `(… spacious density)` become `Spacing (row top/bottom to text)`. `regular` is the
default density and compact and spacious records cover the other values of that property, so the
regular `Row height (minimum)` records are unpinned. `table` has no visual recipe, so nothing
renders differently.
