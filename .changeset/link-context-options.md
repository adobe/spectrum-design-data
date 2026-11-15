---
"@adobe/spectrum-design-data": patch
---

Move the `variant` and `staticColor` qualifiers out of 10 `link` relationship contexts and into
`scope.options` (rule SPEC-093). `Text (secondary)` becomes `Text` with `variant: secondary`
pinned, and `Text (white)` and `Text (black)` become `Text` with `staticColor` pinned. `primary`
is the default variant and the secondary records cover the only other value, so the four
`Text (primary)` records become the unpinned default of `Text`. `link` has no visual recipe, so
nothing renders differently.
