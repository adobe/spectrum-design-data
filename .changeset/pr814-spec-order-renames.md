---
"@adobe/spectrum-tokens": minor
---

Re-apply 100 spec-order token renames from PR #814 gap analysis.

- **color-aliases.json**: 19 tokens deprecated (key-focus→keyboard-focus,
  state-last and structure reordering).
- **color-component.json**: 1 token deprecated (key-focus→keyboard-focus).
- **layout-component.json**: 38 tokens deprecated (divider, illustrated-message,
  list-view, select-box, tab, table, title, tree-view ordering).
- **layout.json**: 7 tokens deprecated (padding-uniform ordering,
  control-color, list-item-padding).
- **semantic-color-palette.json**: 5 tokens deprecated
  (icon-color-* → *-icon-color spec ordering).
- **typography.json**: 30 tokens deprecated (size abbreviations expanded,
  margin multiplier ordering, font-weight rename).
- **snapshots/validation-snapshot.json**: regenerated.

22 icon background tokens and 4 rename-chain intermediaries deferred —
require name-object disambiguation before canonical entries can be added.
