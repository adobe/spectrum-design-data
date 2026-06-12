---
"@adobe/design-data-tui": patch
---

Add truncation ellipsis to result-view table cells that overflow their column.

- **sdk/tui/src/app_views.rs** (`truncate_cell`): new helper that appends `…`
  when a string exceeds its column budget; width measured with `unicode-width`
  so wide glyphs (CJK, emoji) count as two columns.
- **sdk/tui/src/app_views.rs** (`column_budget`): extracted helper that mirrors
  ratatui's percentage layout; `QUERY_NAME_PCT`, `RESOLVE_NAME_PCT`,
  `VALIDATE_TOKEN_PCT` consts tie the budget call to the matching
  `Constraint::Percentage` so they can't drift apart.
- **sdk/tui/src/view.rs** (`render_query`, `render_resolve`, `render_validate`):
  apply truncation to the Name and Token columns; annotate each `column_budget`
  call with the reserved-columns breakdown for maintainability.
- **sdk/tui**: 9 unit tests covering edge cases (`max == 0`, exact fit, ASCII
  overflow, multi-byte Latin, CJK wide chars, saturating underflow).
