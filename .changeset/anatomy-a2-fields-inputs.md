---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": minor
---

Review the anatomy of the input fields: text-field, text-area, search-field, number-field,
combo-box, picker, tag-field and the shared `field`. Every live relationship record (880) now
names its part (`scope.part`), and inner spacings name their two ends (`scope.between`).

- Each component has a root part `container` (width, and the spacing between label, field and
  help text) that holds `field-label`, `field` and `help-text`. The bordered box is the part
  `field` (it was `container`). tag-field renames `text-area` to `value`.
- Colors on the box carry `attribute: border` or `background`.
- number-field gets its first anatomy (field, stepper, two in-field buttons); its three
  "Positive icon" records (no source has one) are removed.
- Picker: two copy-pasted contexts are corrected, and its subdued color is the `placeholder`.
- Registry: `segment` is added, `field-button` and `stepper` are removed (`stepper` stays as an
  alias of `in-field-stepper`), and `field` is described as the box.
- The eight components are marked `reviewed` (level 1, `field` level 2).

Legacy `@adobe/spectrum-tokens` output is byte-identical. Deprecated records are untouched.
