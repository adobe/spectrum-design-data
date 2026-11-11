---
"@adobe/spectrum-design-data": minor
---

Retire 24 accordion `top-to-text-*` and `bottom-to-text-*` relationship records
(compact, regular and spacious, by size).

Header vertical padding now depends on size only (`Title (vertical)`,
`base-padding-vertical-medium` to `2x-large`). Density adds outer padding through the
`Header (vertical)` records: `list-item-padding-vertical-regular` and `-spacious`.
Compact has none. This matches the current S2 Web Figma accordion item.

The deprecated legacy tokens stay.
