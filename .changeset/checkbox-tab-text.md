---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Correct the Checkbox keyboard text: no group focus handling.

- Each checkbox is its own tab stop; Tab and Shift + Tab move between them.
- Removes "Tabbing into a group places the focus on the first checkbox".
- Data text only. No render or spec sheet changes.
