---
"@adobe/design-data": minor
---

Make validation catalog-aware so inline mode sets are preserved when a mode-sets
catalog is passed (closes spectrum-design-data-ydg).

- **sdk/core/src/graph.rs**: add `from_json_dir_with_names_and_catalogs` (sidecar
  names + catalog extend); `from_json_dir_with_catalogs` now delegates to it.
- **sdk/core/src/validate/mod.rs**: `validate_all_with_options_and_names` extends
  (no longer replaces) `mode_sets`, so inline mode-set docs co-located in the
  token tree are seen by SPEC-005/008/041 alongside catalog mode sets.
