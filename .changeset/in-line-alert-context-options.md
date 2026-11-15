---
"@adobe/spectrum-design-data": patch
---

Move the `variant` qualifier out of 46 `in-line-alert` relationship contexts and into
`scope.options` (rule SPEC-093). `Background (Bold fill, Informative)` becomes
`Background (Bold fill)` with `variant: informative` pinned, and the same for the negative,
notice and positive variants and for the subtle and border fills. `neutral` is the default
variant, so where a sibling covers the other variants its records are unpinned.
`in-line-alert` has no visual recipe, so nothing renders differently.
