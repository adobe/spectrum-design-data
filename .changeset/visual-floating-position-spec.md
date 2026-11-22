---
"@adobe/design-data-spec": minor
---

Add `floating.position` to component visual recipes: a part placed at a fraction
of a part's box along x and/or y, from a numeric option with `min`, `max`,
`invert` and `align`, or a part whose length on an axis is the span between two
fractions (`length`, `from`). It draws a slider or colour handle at a value and a
fill that grows with it. Out of range values are clamped with a diagnostic. Add
rule SPEC-114, which checks the declaration.

An unset option value draws at the start with no diagnostic. An axis can be a list
of entries picked by `when` (for example `orientation`), and a nested `component`
part (a colour handle) can be positioned. SPEC-114 checks that option names are
number options of the component.
