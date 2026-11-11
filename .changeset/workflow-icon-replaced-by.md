---
"@adobe/spectrum-design-data": minor
"@adobe/spectrum-tokens": minor
---

Set `lifecycle.replacedBy` on the deprecated `workflow-icon-size-*` tokens.

Replacements go by t-shirt position:

- 50 → `workflow-icon-extra-small`
- 75 → `workflow-icon-small`
- 100 → `workflow-icon-medium`
- 200 → `workflow-icon-large`
- 300 → `workflow-icon-extra-large`

Relationships that bound the old tokens now point at the replacements.
Desktop medium, large and extra-large sizes shrink on purpose
(20/22/26 → 18/20/22px) to align icons with line height.
Mobile values and sizes 50 and 75 are unchanged.
The legacy `layout.json` gains `renamed` and `deprecated_comment`.
