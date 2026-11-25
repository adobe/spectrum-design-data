---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Correct the Checkbox group keyboard text: no arrow-key navigation.

- Each checkbox is its own tab stop; Tab and Shift + Tab move between them.
- The arrow keys, Page Up/Down and Home/End rows are removed: React Spectrum S2 and
  Web Components do no roving focus in a checkbox group.
- Data text only. No render or spec sheet changes.
