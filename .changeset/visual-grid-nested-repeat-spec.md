---
"@adobe/design-data-spec": minor
---

Add a `grid` layout, subtrees and nested repeats to component visual recipes.

`direction: "grid"` lays cells out in `columns` per row, with `columnGap` and `rowGap`,
filling row by row from flowed children or repeated copies (calendar months, tables).
A `box` child that is a grid or declares `repeat` is laid out as its own subtree, so a
calendar's title, weekday row and day grid, or a table's header and body, share one tree.
A `repeat` may sit on a part another `repeat` draws (a tree's levels); a nested repeat
with no entries draws nothing.

New rule SPEC-116 checks the declaration. The engine clamps a bad column count, draws at
most 5000 repeated copies and subtrees per scene, and nests at most 6 deep.
