---
"@adobe/spectrum-design-data": patch
---

Accordion: the item can show its direct actions, an icon-only action button and a
switch, spaced by the "Spacing (section title to action area)" relationship. The
component gains the `hasActionButton` and `hasSwitch` options (per item in a
data-driven accordion: `items[].hasActionButton`, `items[].hasSwitch`) and the
anatomy parts `direct-actions`, `action-button` and `switch`. Renders with both
options off are unchanged.
