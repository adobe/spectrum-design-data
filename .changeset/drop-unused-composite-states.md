---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Remove the unused composite states `focus-+-hover` and `focus-+-not-hover` from the
date-field, time-field and tag-field component declarations. No relationship, recipe
or visual uses them there, so renders and spec sheets are unchanged. The other field
components keep them: pinning `focus` there changes which record keyboard-focus
renders select.
