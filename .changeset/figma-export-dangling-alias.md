---
"@adobe/spectrum-design-data": patch
---

Figma export no longer sends `VARIABLE_ALIAS` references to variable ids that
were never created, which Figma would reject (closes spectrum-design-data-qz1o).

- **sdk/core/src/figma/mapping.rs**: `build_export_payload` now drops any
  `ModeValueAction` whose `VARIABLE_ALIAS` targets an id absent from the
  emitted `variables` list (e.g. an alias target with malformed `sets`) and
  records a `mode_warnings` entry instead of emitting the dangling reference.
