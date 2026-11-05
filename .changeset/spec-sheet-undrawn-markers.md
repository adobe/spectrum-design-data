---
"@adobe/design-data-spec": minor
---

Spec sheet markers say whether the visual draws them.

- Each `render.markers[]` entry has a required `drawn` boolean. An undrawn marker keeps
  its number on the rows.
- A measurement's `label` is the bound token's name, the name the token rows show.
- A marker's `label` is its group's relationship property without the size part, so groups
  with identical rows are told apart.
