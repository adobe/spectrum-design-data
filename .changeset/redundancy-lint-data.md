---
"@adobe/spectrum-design-data": patch
---

Merge relationship records that said the same thing twice (SPEC-100): the three `accordion`
`padding-horizontal` records per scale become one with `size: [m, l, xl]`, the six
`action-button` static-color `Background` pairs become six records with
`staticColor: [black, white]`, and nine `button` records pinning `variant` to a subset of a
sibling's values are dropped. Nineteen records go. Nothing renders differently.
