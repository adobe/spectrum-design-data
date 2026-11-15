---
"@adobe/spectrum-design-data": patch
---

Move the `medium` qualifier out of nine `breadcrumbs` relationship contexts and into
`scope.options.size: m` (rule SPEC-093). Two of them also pin `isMultiline: false`, so a
multiline request never ties with the `isMultiline` records. `breadcrumbs` has no visual
recipe, so nothing renders differently.
