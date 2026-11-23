---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add visual recipes for breadcrumbs and steplist.

- Both bind through the component relationships.
- Breadcrumbs: new `isCurrent` and `isDisabled` options.
- Breadcrumbs: `separator` is present only when the option is `chevron`.
- Breadcrumbs: size l spacing records pin `size: l`; disabled text pins `isDisabled`.
- Steplist: new `stepState` and `isDisabled` options and a `row` anatomy part.
- Steplist: text and visual colors pin `stepState` and `isDisabled`.
- Not drawn yet: multiline, truncation menu, hover and focus states.
- Not drawn yet: steplist vertical layout, check mark and step number.
