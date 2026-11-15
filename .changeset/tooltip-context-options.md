---
"@adobe/spectrum-design-data": patch
---

Move the `variant` qualifier out of 7 `tooltip` relationship contexts and into `scope.options`
(rule SPEC-093).

* `Background (Informative)` and `Background (Negative)` become `Background` with
  `variant: informative` or `variant: negative` pinned.
* `neutral` is the default variant and the other two declared values both have records, so the
  `Background (Neutral)` record becomes the unpinned default of `Background`.

`tooltip` has no visual recipe, so nothing renders differently.
