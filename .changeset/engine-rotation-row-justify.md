---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Fix two layout bugs in the visual recipe engine (layout revision 7).

- An icon that is a direct child of the root flow now honors its `rotation`.
  The in-field button chevron (and so the combo-box chevron) points down, as in
  Figma and React Spectrum S2.
- A row box now honors its `justify` (`start`, `center`, `end`). Before, it
  packed items at the start whatever the recipe said. An unbound row box still
  packs at the start. The alert dialog button row (`justify: end`) now draws at
  the end, and the combo-box in-field button sits at the field end when empty.
- `LAYOUT_REVISION` and the dataset `layoutRevision` move to 7, and the dataset
  `requires.cli` is raised to the unreleased 0.63.5. Goldens and recipe
  snapshots are regenerated. Legacy token output is unchanged.
