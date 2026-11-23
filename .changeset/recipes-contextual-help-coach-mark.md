---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add visual recipes for contextual-help and coach-mark.

- contextual-help: nested action button and, while open, a popover with title,
  description and a nested link.
- The popover surface is a box of the recipe, not the nested popover: a nested
  popover gets no slot fills yet (bead 5m92.32.22). The anatomy still says
  `component: popover`; they differ on purpose until then.
- coach-mark: card (width, padding, radius, fill, elevated shadow), title,
  description and a `button-group` slot of buttons (temporary, bead 5m92.32.22).
- contextual-help gains `title` and `description` options; the link shows when `href` is set.
- SPEC-083 accepts root props on a floating part with children.
- Not drawn yet: coach-mark cover image (its height tokens are deprecated),
  action button and pagination; popover border and three-layer shadow; the
  nested button draws `+`, not the info/help icon; the mobile coach-mark footer
  overflows the card.
