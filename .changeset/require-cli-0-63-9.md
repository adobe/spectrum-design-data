---
"@adobe/spectrum-design-data": patch
---

Raise the dataset `requires.cli` from 0.63.8 to 0.63.9, the oldest released CLI
  that draws and checks this data.

- Older CLIs now refuse the data with a `requires.cli` message instead of misreading it.
  The list-view, takeover-dialog and illustrated-message recipes, the per-axis aria checks
  (`axisAria`) and the inline collection item semantics lint (SPEC-118) are in the 0.63.9
  binary only.
- `layoutRevision` stays at 8. No recipe, data or engine change.
