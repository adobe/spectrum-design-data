---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

A row recipe that binds no `minHeight` and no block padding now hugs its content instead of
being 32px high (layout revision 2). No shipped recipe changes: the render snapshots and the
iOS recipes are identical. Fixes #1800.
