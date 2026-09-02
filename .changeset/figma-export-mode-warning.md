---
"@adobe/spectrum-design-data": patch
---

Figma export now warns when a token's mode has no matching mode in the
target collection, instead of silently dropping that mode value (closes
spectrum-design-data-11k.8.2).

- **sdk/core/src/figma/mapping.rs**: `ExportSummary` gains `mode_warnings`;
  `process_color_set_token`/`process_scale_set_token` record a warning
  naming the token, mode, and collection when the target collection has no
  matching mode, instead of silently skipping.
- **sdk/cli/src/main.rs**: `figma export` prints mode warnings after the
  summary.
