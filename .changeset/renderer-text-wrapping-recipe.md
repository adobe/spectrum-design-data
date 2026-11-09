---
"@adobe/spectrum-design-data": patch
---

Badge visual recipe: the container binds its "Minimum height" relationship as
`minHeight` and the label sets `overflow: wrap`, so a long label wraps at a
narrow width and the badge grows. One-line renders are unchanged.
