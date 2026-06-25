---
"@adobe/design-data-tui": minor
---

Add core mode-set lifecycle operations (Phase B / B3, closes #spectrum-design-data-122.3).

- **sdk/core/src/authoring/mode_set.rs**: new module with five mode-set mutation
  ops — `add_mode`, `rename_mode` (with full cascade propagation to token `name`
  fields), `remove_mode` (guarded against referenced tokens and the active default),
  `create_mode_set` (authors a new mode-set file with canonical `$schema` /
  `specVersion`), and `remove_mode_set` (guarded against any token referencing the
  dimension).
