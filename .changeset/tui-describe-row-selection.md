---
"@adobe/design-data-tui": minor
---

Add line-based row selection and yank to the Describe view (closes #9dv).

- **sdk/tui**: j/k/g/G/PgUp/PgDn move a highlighted line cursor; viewport follows.
- **sdk/tui**: `y` yanks the selected line; `Y` yanks the full JSON document.
- **sdk/tui**: DESCRIBE_HINT footer updated to advertise `y yank · Y all`.
