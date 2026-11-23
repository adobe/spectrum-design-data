---
"@adobe/design-data-spec": minor
---

Add a `grid` root layout and nested repeats to component visual recipes.

`direction: "grid"` lays a root's cells out in `columns` per row, with `columnGap`
and `rowGap`, filling row by row from flowed children or repeated copies (calendar
months, tables). A `repeat` may now sit on a part another `repeat` draws (a tree's
levels), and a nested repeat with no entries draws nothing.

New rule SPEC-116 checks the declaration. The engine clamps a bad column count,
caps a repeat at 2000 copies and nests at most 6 deep.
