---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add visual recipes for tabs and segmented-control.

- Both bind through the component relationships.
- New `isSelected` option and `items[].isSelected` on both components.
- `selection-indicator` is present only when `isSelected` is true.
- Relationships: tab text colors pin `isSelected`; segmented gap pins `hideTracker`.
- Sizes s, l and xl are not drawn faithfully (see PR).
- Not drawn yet: overflow, truncation, vertical selection bar,
  focus ring, per-item hover and per-item `state`.
