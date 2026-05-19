---
"@adobe/design-data-tui": minor
---

Wire `:query` into the TUI — M1 of RFC #973.

- **sdk/tui/**: typing `:query property=<expr>` renders a filtered table
  (Name/Value/File/Layer), up/down and j/k navigate, `y` yanks the
  selected row's name to the system clipboard.
