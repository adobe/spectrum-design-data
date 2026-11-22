---
"@adobe/spectrum-design-data": minor
"@adobe/spectrum-component-api-schemas": minor
---

feat(design-data): accordion headingLevel option and per-item isDisabled

- Add the `headingLevel` option to accordion (integer 1 to 6, default 3).
  It matches React Spectrum S2 `AccordionItemTitle` `level`.
  It is an accessibility value and changes no render.
- Add `isDisabled` (boolean, default false) to the accordion `items[]`
  entries, matching S2 `AccordionItem`.
- Add a heading-structure guideline to the accordion document blocks.
- The accordion visuals still read the component-level `isDisabled`.
  Drawing one disabled item needs the engine to read `items[].isDisabled`.
