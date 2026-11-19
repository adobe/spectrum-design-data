---
"@adobe/spectrum-design-data": patch
---

Fix relationship records whose `context` role disagreed with their property. No token value or
render changes.

- color-area, color-loupe and takeover-dialog: "Size" and "Height & width" become "Width",
  "Height", "Minimum width" or "Minimum height" to match the property.
- tree-view disclosure indicator width and height: "Spacing (disclosure indicator)" becomes
  "Width (...)" and "Height (...)".
- color-slider and drop-zone corner radius become "Corner radius"; drop-zone border width becomes
  "Border width".
- date-picker minimum height: "Popover minimum width" becomes "Popover minimum height", a new
  alias of the height role.
- in-field-progress-circle size records: "Height" becomes "Size", and the visual recipe selector
  follows.
