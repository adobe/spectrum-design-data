---
"@adobe/design-data-spec": minor
---

Visual recipes can declare a relationship context as derived instead of bound.

The recipe schema gains a `derived` array (`context`, `property`, `part`, optional `edge`, and
`from`). The only formula is `(height - <part>.lineHeight) / 2` (or `.height`). New rule SPEC-087
warns when the token of a derived context disagrees with its formula for any size and scale. The
spec sheet schema gains `derived` on markers and measurements.
