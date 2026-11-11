---
"@adobe/spectrum-design-data": minor
---

Remove two options that exist only in Spectrum 1, not in any current design or code source.

- `badge`: removed the `fixed` option (none/top/right/bottom/left) and the eight recipe
  branches that squared corners per edge. Badges always render with full corner rounding.
- `action-button`: removed the `selectedTextColor` option, which the recipe never used.
