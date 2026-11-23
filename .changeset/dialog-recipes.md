---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add visual recipes for alert-dialog and standard-dialog.

- The dialog surface binds width, minimum width, rounding, padding and
  background through relationships. Dialogs have no shadow in Figma or S2.
- Title and description bind type, color and the title-to-description gap.
- Both dialogs gain `header` and `footer` anatomy parts (terms already in the
  registry). alert-dialog draws the status icon at the end of the title row for
  the warning and error variants.
- The actions are a slot that takes up to three buttons; both dialogs gain an
  `button-group` slot (a temporary stand-in for a nested button-group, bead
  5m92.32.22). standard-dialog draws the
  footer-content slot (a checkbox) beside the actions in the footer.
- Not drawn yet: the overlay scrim, the standard-dialog cover image, header
  content and close button. Long titles do not wrap in the header row.
- Render snapshots and goldens are regenerated. Legacy token output is unchanged.
