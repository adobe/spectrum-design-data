---
"@adobe/design-data-tui": patch
---

Add architectural budget test and split oversized source files (GH #1018).

- **`tests/budget.rs`**: enforces 3 invariants — no src file >800 LOC, no `async fn`
  in render path (`view.rs`, `view_find.rs`), `Message` size ≤128 bytes.
- **`src/update_command.rs`**: new module; `handle_palette_submit` + `dispatch_command`
  extracted from `update.rs` (953 → 612 LOC).
- **`src/view_find.rs`**: new module; find-wizard render helpers extracted from
  `view.rs` (809 → 629 LOC).
- **`src/app_views.rs`**: new module; view/data state types + `layer_str` extracted
  from `app.rs`.
- **`src/app_palette.rs`**: new module; legacy `App::submit_palette` extracted from
  `app.rs` (1259 → 652 LOC).
