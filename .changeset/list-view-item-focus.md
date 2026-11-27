---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Draw the list-view focus ring on one row, not every row.

- New `isFocusVisible` option, per row as `items[].isFocusVisible`. The name follows the React
  Spectrum S2 ListView item render prop of the same name. The `focus-indicator` ring is present
  only for a row that sets it; with no row set, no ring is drawn.
- The `keyboard-focus` state no longer draws the ring. It still applies the background and text
  color to every row, as before.
- The ring still uses the existing focus-indicator color, thickness and gap records. The
  description stays under the checkbox and a multiple-selection row stays 48 px.
- Not verified against Figma: the Figma list view focus spec was not checked here.
