---
"@adobe/design-data-spec": patch
---

Compiled recipes describe `iconChoices` for content icons.

A compiled recipe no longer depends on the request `icon`. Each content icon part lists the
drawing key of every catalog icon in `iconChoices`, so a renderer with one precompiled variant
and no catalog can apply the request icon. Existing `drawing`, `drawingMiss` and `drawings`
fields are unchanged.
