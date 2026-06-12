---
"@adobe/design-data-tui": minor
---

Group repeated validate findings by (rule, message) with an occurrence count badge
and Enter expand/collapse, replacing the unnavigable flat list.

- **sdk/tui/src/model/views.rs** (`ValidateGroup`, `VisibleRow`, `ValidateView`):
  groups findings by `(rule_id, message)`, builds a projected `visible` list of group
  headers and expanded children; `toggle_selected` flips expand/collapse with selection
  preserved on the header.
- **sdk/tui/src/view/results.rs** (`render_validate`): renders group headers with
  `×N ▶/▼` badge in the Token column; expanded children show indented tokens;
  new `VALIDATE_HINT` advertises `Enter expand`.
- **sdk/tui/src/update.rs** (`handle_view_key`): `Enter` toggles the selected group;
  j/k/g/G navigate `visible_len()` instead of `rows.len()`.
