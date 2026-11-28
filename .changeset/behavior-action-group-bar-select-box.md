---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add behavior contracts for Action group, Action bar, Select box and Select box group.

- Action group: role `toolbar` (also set in its accessibility block), orientation, `arrowOrder`,
  `disabled`, `selection` and `allowsEmpty` facets, and a `collection` of action buttons: choose by
  selection mode, no wrap, skip a disabled button, roving focus, no Home or End. `aria-orientation`
  is exposed. Overflow is left out.
- Action button now chooses itself with `choose` instead of `toggle`, so a group can coordinate
  single and multiple selection. A standalone action button behaves as before.
- Action bar: role `toolbar` (also in its block), no state of its own.
- Select box: the box as an item, like Swatch (`isSelected`, `isDisabled`, `activate` chooses).
- Select box group: role `group`, a `collection` of select boxes chosen by `selectionMode`, empty
  allowed, no wrap, skip a disabled box, roving focus.
- Role key vectors for the button item are scoped to Accordion, plus two for Action group.
- 67 new vectors; mutation tests fail when a flag, guard or facet is broken.
