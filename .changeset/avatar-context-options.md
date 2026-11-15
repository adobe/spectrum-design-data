---
"@adobe/spectrum-design-data": patch
---

Move the `image` qualifier out of 6 `avatar` relationship contexts and into `scope.options`
(rule SPEC-093). `Text (initials)` becomes `Text` with `image: initials` pinned. The default
`image` is `user image` and no `Text` record covers the other values, so the pin stays and an
avatar showing a picture has no `Text` binding, as before. `avatar` has no visual recipe, so
nothing renders differently.
