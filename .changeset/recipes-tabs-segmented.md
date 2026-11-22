---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add visual recipes for tabs and segmented-control.

- Both bind through the component relationships; sizes s, m, l and xl all draw from design-data tokens.
- New `isSelected` and `isDisabled` options and `items[].isSelected` on both components.
- `selection-indicator` is present only when `isSelected` is true.
- Tab text colors pin `isSelected`; segmented gap pins `hideTracker`.
- New live `Height` relationships for tabs `regular` density.
- The 12px tabs `Spacing` record is pinned to vertical orientation.
- Not drawn yet: overflow, truncation, vertical selection bar, focus ring and per-item states.
