---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": patch
---

Recipe engine features for the calendar range band (all opt-in, no layout revision change).

- A stack child that binds no `direction` places itself with its own `justify` and `align`;
  its `width` may be a fraction of the stack (`relativeTo: parent`).
- A flowed box below the root draws per-corner radii (`cornerRadiusStartStart`, ...).
- `when.rowPosition` (`first`, `middle`, `last`, `only`): a repeat inside a grid tells each copy
  its place in its grid row. SPEC-061 validates it. Spec and schema updated.
- The calendar band is flush with the range end circles, continuous, and capped at week row
  edges. Goldens and snapshots are regenerated. Legacy token output is unchanged.
- Not done: the dashed range border (needs per-side stroke and dashed stroke support).
