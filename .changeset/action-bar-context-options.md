---
"@adobe/spectrum-design-data": patch
---

Move the emphasized option out of eight `action-bar` relationship contexts and into
`scope.options` (rule SPEC-093). `Control (selected, emphasized)` and `Background (emphasized)`
pin `isEmphasized: true`; `Control (selected, non emphasized)` is the unpinned default of
`Control (selected)`. `action-bar` has no visual recipe, so nothing renders differently.
