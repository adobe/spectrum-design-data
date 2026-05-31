---
"@adobe/design-data": minor
---

Fix the TUI authoring wizard dropping all but the first mode-combo row on write.

- **sdk/core/authoring/draft**: add shared `build_value_fields` that emits flat
  `$ref`/`value` for a single default row and nested `sets` for multi-mode rows.
- **sdk/core/authoring/session**: delegate token-value assembly to the shared helper.
- **sdk/tui/wizard**: build the written token (and live diff) from every value row
  via the shared helper, and use the canonical `$ref` alias key instead of `$alias`.
- **sdk/tui/DEMO.md**: correct Beat B3 to use `:query`/`:find`; note `/` fuzzy-find
  is not yet wired.
