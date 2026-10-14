---
"@adobe/design-data-tui": minor
---

Figma export and audit map the design-data graph directly (closes xqln.14).

- **sdk/plugins/figma/**: the mapper groups cascade records into export tokens without
  the legacy projection; payloads match the previous output byte for byte.
- **sdk/cli/**: `figma export` and `figma audit` reject flat legacy token directories.
- **sdk/plugins/figma/src/import/**: `diff_values` no longer takes a legacy token list.
- **sdk/plugins/figma/tests/**: a pinned cascade fixture has a golden payload.
