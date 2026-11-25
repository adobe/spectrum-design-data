---
"@adobe/spectrum-design-data": patch
---

Raise the dataset `requires.cli` from 0.63.6 to 0.63.7, the released CLI that reads this data.

- Older CLIs now refuse the data with a `requires.cli` message instead of misreading it.
  The behavior contracts (collection block, accordion, swatch, tooltip, group and display
  contracts), the behavior runner and the registry facets are in the 0.63.7 binary only.
- `layoutRevision` stays at 8. No recipe, data or engine change.
