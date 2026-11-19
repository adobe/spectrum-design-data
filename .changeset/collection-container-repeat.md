---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

Declare a collection on its container part, and add position conditions. Layout revision is 4.

- `repeat` moves from the recipe to the root part (the container). It gains `part`, the direct
  child that repeats; the item does not know it is repeated. The recipe-level `repeat` is removed
  (draft spec; only the accordion used it).
- Each copy is solved as its own root and placed as a flowed child of the container, so the
  container's `direction`, `gap` and padding apply. A container with a fixed width makes copies
  fill it; a container with no width hugs them (widest copy in a column, sum in a row).
- A single copy (one entry or none) keeps plain node ids; several are `<part>-<n>`.
- `when.position` and `visibleWhen.position` take `first`, `middle`, `last` or `only`, evaluated
  per copy. SPEC-061 checks the values and that `position` sits inside a repeated part; SPEC-060
  checks `repeat.part` is a child of the root.
- Accordion gains a `container` root that owns the width records; its goldens gain the container
  node, and the width token moves to it.
