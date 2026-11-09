---
"@adobe/spectrum-design-data": patch
---

Checkbox, radio button and switch visual recipes: the container binds its
"Minimum height" relationship as `minHeight` and the label sets
`overflow: wrap`, so a long label wraps at a narrow width and the control stays
on the first line. One-line renders are unchanged.
