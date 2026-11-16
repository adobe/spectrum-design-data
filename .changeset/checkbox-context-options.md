---
"@adobe/spectrum-design-data": minor
---

Move the selected, indeterminate, emphasized, error and disabled qualifiers out of the `checkbox`
relationship contexts and into `scope.options` (rule SPEC-093), using an any-of for
"selected or indeterminate". The selected fills are now `background-color` / `Control` records
pinned with `anyOf: [{ isSelected }, { isIndeterminate }]`, and the error and disabled records pin
`isDisabled: false` or `isDisabled: true` so disabled beats error beats emphasized, as the recipe
priorities did. The `checkbox` recipe binds the same selector for every state, so its emphasized,
error and disabled entries are gone. Six unreferenced duplicate records are removed. Renders are
unchanged. `checkbox` was the last component in the SPEC-093 baseline, which is now empty.
