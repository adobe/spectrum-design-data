---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add visual recipes for alert-dialog and standard-dialog.

- The dialog surface binds width, minimum width, rounding, padding and
  background through relationships, and an elevated drop shadow through the
  atomic drop-shadow tokens (one layer).
- Title and description bind type, color and the title-to-description gap.
- alert-dialog draws the status icon for the warning and error variants.
- The actions are a slot that takes up to three buttons; both dialogs gain an
  `button-group` slot. standard-dialog draws the
  footer-content slot (a checkbox) above the actions.
- Not drawn yet: the overlay scrim, the standard-dialog cover image, header
  content and close button, and the icon and footer on the title and button rows.
- Render snapshots and goldens are regenerated. Legacy token output is unchanged.
