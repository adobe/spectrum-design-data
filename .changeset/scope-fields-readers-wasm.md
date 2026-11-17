---
"@adobe/design-data-wasm": patch
---

Read `scope.between` and the descriptive scope fields (`object`, `position`, `structure`,
`qualifier`, `icon`) wherever a reader looked at `from`, `to`, `object` and the like in
`scope.options`: legacy token conversion and context suggestions. A record gives the same result
in either place, and the new place wins when both are set. The tie ratchet and SPEC-100 treat
records that differ only in those fields as different. The committed data is unchanged.
