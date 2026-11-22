---
"@adobe/design-data-spec": minor
---

A floating part can now host `children`: it is laid out as a subtree (its size comes
from its own layout) anchored to the root, and the scene grows to hold the whole
subtree and its shadows. A box can bind `path` (`d` of SVG path data without arcs,
optional `viewBox` and `fillRule`) to draw as a closed shape, such as a teardrop loupe
or a tip with a rounded point, with fill, checker pattern, centered stroke and shadow
in the scene, SVG and PNG. Add rule SPEC-113 (path data the engine can draw) and relax
SPEC-112 for floating subtrees. A shadow layer with `x`, `y` or `spread` beyond 1000px
is skipped with a diagnostic, so SVG and PNG size the canvas alike; an unresolved
floating `offset` or `crossOffset` now reports a diagnostic; floating parts of a nested
recipe are dropped with a diagnostic.
