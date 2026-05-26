---
"@adobe/design-data-tui": patch
---

Refactor shared wizard infrastructure into `wizard_common` (RFC #973 D3).

- **`wizard_common/classification.rs`**: Moved `ClassificationDraft`, `NameField`,
  `assemble_name_from_classification`, `cycle_layer_{forward,backward}` out of
  `wizard.rs`; re-exported from `wizard` for backward compat.
- **`wizard_common/caps.rs`**: Moved `MAX_PROPERTY_SUGGESTIONS` and
  `MAX_SUGGEST_RESULTS` out of `find.rs` to end duplication with `main.rs`.
- **`app.rs`**: Added `Modal::wants_scroll`, `on_scroll`, `persist`, and
  `screen_label`; collapsed the scroll allowlist and wizard-persist guard into
  single-call-site dispatch.
