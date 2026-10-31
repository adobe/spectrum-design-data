---
"@adobe/spectrum-design-data": patch
---

Point the second duplicate relationship at the mobile token in 17 components.

103 relationship records referenced the desktop token twice, so the mobile token was never
reachable through the relationship. The second record of each pair now references the token with
the same name and the mobile scale.

Components: accordion, combo-box, date-picker, drop-zone, list-view, menu, number-field, picker,
search-field, segmented-control, side-navigation, tag, tag-field, text-area, text-field, tooltip
and tree-view.
