---
"@adobe/design-data-tui": patch
---

Add footer hints, g/G jump, and empty-state copy to result views.

- **results.rs**: add 1-row muted footer hint line to query, resolve, validate,
  and describe views showing available keys (j/k, g/G, y, Esc).
- **update.rs** + **app.rs**: add `g`/`G` to jump first/last row in list views;
  scroll top/bottom in describe.
- **results.rs**: show centered empty-state message when query/resolve returns
  zero results or validate finds no issues.
