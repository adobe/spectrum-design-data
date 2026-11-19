---
"@adobe/design-data-wasm": patch
---

Component changelogs now classify a change to a relationship's `scope.options` pin
as a visual change instead of metadata. A pin selects which record renders, so it
was previously counted but not listed.
