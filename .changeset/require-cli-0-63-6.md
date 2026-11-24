---
"@adobe/spectrum-design-data": patch
---

Raise the dataset `requires.cli` from 0.63.5 to 0.63.6, the released CLI that draws this data.

- Older CLIs now refuse the data with a `requires.cli` message instead of drawing it wrongly.
  0.63.5 reads `inherit` contentColor as cornerRadius and ignores strokeDash, per-side stroke
  properties, the new recipe features, and the color-slider and color-area defaults.
- `layoutRevision` stays at 8. No recipe, data or engine change.
