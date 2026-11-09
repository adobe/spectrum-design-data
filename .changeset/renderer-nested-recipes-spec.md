---
"@adobe/design-data-spec": minor
---

Component visuals: a part of kind `component` draws another component's recipe
inside the host (nested recipes).

The part names the `component`, a `sizeMap` from each host size to a nested size,
and `with` options that are literals or `{"option": name}` read from the host's
request. The nested recipe is solved on its own and its nodes join the scene: the
root node keeps the host part id and the others are `<part>.<inner>`, so anatomy
views and spec-sheet markers still see one part. Host states do not reach it.
A row box can group `component` parts and drops out when none is visible. Nesting
is limited to two levels and may not cycle. New rule SPEC-089
(`visual-nested-component-valid`); `component-visual.schema.json` accepts the new
kind and its `component`, `sizeMap` and `with` fields. Compiled recipes gain
`nested` and `nestedSize` on `component` parts only.
