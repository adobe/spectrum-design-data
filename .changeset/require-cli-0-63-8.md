---
"@adobe/spectrum-design-data": patch
---

Raise the dataset `requires.cli` from 0.63.7 to 0.63.8, the released CLI that reads this data.

- Older CLIs now refuse the data with a `requires.cli` message instead of misreading it.
  The `scope.ordinal` identity field (SPEC-125) and the spec-sheet plugin are in the 0.63.8
  binary only, so older CLIs cannot load datasets that use `scope.ordinal` (avatar is the first).
- `layoutRevision` stays at 8. No recipe, data or engine change.
