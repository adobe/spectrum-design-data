---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-spec": patch
"@adobe/design-data-wasm": patch
---

Recipe engine: a nested component's label follows the request label (layout revision 8).

- A `with.label` that reads the host's `label` option got an empty label unless that option was a
  string. The explorer and `design-data render --label "x"` send the label as the request label,
  so the field label of checkbox-group, color-slider, combo-box, number-field, picker,
  radio-group, search-field, slider, text-area and text-field drew nothing. The request label
  now flows to the nested label when the option is a presence flag (`true`).
- An empty request label, a `label` option of `false` and a string option behave as before.
- Output changes for those ten recipes only (their snapshots and 29 goldens); every other
  recipe is byte-identical. `LAYOUT_REVISION` and the dataset `layoutRevision` are now 8;
  `requires.cli` stays at the unreleased 0.63.5, which carries revision 7 and 8 together.
