---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
---

Add behavior contracts for Swatch and Swatch group.

- Swatch: states `isSelected` and `isDisabled`; `activate` chooses it while enabled. No role yet
  (open question), tab stop focus.
- Swatch group: `selection` (from `enableSelection` and `selectionMode`) and `allowsEmpty` facets,
  registered in the facets registry, and a `collection` of swatches: choose by selection mode,
  no wrap, skip a disabled swatch, no select on move. Role `group` and the accessibility blocks
  stay. Arrow keys have no web binding until the role is decided.
- 23 group vectors and 7 swatch vectors; mutation tests fail when a traversal flag, choose mode
  or guard is broken. No render or spec sheet change.
