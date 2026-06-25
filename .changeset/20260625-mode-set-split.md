---
"@adobe/design-data-tui": patch
---

Split at-cap mode-set modules to restore LOC headroom.

- **sdk/tui/src/authoring/mode_set_handlers.rs**: new file — handler/builder methods
  extracted from `mode_set.rs` which was at the 800-LOC cap; now 238 LOC.
- **sdk/tui/src/authoring/mode_set.rs**: retains data types only (238 LOC, was 799).
- **sdk/tui/src/view/authoring_mode_set.rs**: new file — six mode-set renderers
  extracted from `view/authoring.rs` which was at the 798-LOC cap.
- **sdk/tui/src/view/authoring.rs**: retains dispatcher and lifecycle renderers
  (581 LOC, was 798).
