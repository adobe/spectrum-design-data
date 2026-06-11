---
"@adobe/design-data-tui": patch
---

Add truncation ellipsis to result-view table cells that overflow their column.

- **sdk/tui/src/app_views.rs** (`truncate_cell`): new helper that appends `…`
  when a string exceeds its column budget.
- **sdk/tui/src/view.rs** (`render_query`, `render_resolve`, `render_validate`):
  apply truncation to the Name and Token columns using a budget derived from the
  live terminal width.
