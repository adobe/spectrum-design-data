---
"@adobe/design-data-spec": minor
"@adobe/design-data-tui": minor
"@adobe/design-data-wasm": minor
---

Let a platform manifest overlay add/remove naming exceptions onto the base
set used by naming validation (bead spectrum-design-data-h890.23.4),
completing the cascade parity work for h890.23.

- **packages/design-data-spec/schemas/manifest.schema.json**: `extensions`
  gains `namingExceptions` (`{ add, remove }`, both optional arrays of
  non-empty strings).
- **packages/design-data-spec/spec/manifest.md**: capability matrix and a new
  `extensions.namingExceptions` subsection document the add/remove overlay
  semantics (`remove` applied before `add`, so add wins on overlap).
- **sdk/core/src/naming.rs**: new `apply_naming_exceptions_overlay` helper;
  naming exceptions stay a plain `HashSet<String>` outside `TokenGraph`, so
  the overlay is applied where `validate_all_with_full_options` already
  loads the sibling `manifest.json`, rather than as a graph-cascade section.
