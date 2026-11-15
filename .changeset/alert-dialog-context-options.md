---
"@adobe/spectrum-design-data": patch
---

Move the `variant` qualifier out of 8 `alert-dialog` relationship contexts and into
`scope.options` (rule SPEC-093).

* `Icon (error variant)` and `Icon (warning variant)` become `Icon` with `variant: error` or
  `variant: warning` pinned.
* `Icon (error and warning variants)` becomes `Icon` with the any-of pin
  `variant: ["error", "warning"]`.
* `alert-dialog` declares five variants and the default, `confirmation`, has no record, so every
  record keeps its pin.

`alert-dialog` has no visual recipe, so nothing renders differently.
