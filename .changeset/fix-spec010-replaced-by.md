---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-spec": patch
---

Fix stale `replaced_by` UUIDs and re-enable cascade token validation in CI.

- **`packages/design-data/tokens/`**: corrected 70 deprecated tokens whose `replaced_by`
  (and co-located `$ref`) fields held legacy scale-set wrapper UUIDs that no longer exist
  in the cascade dataset. Targets are now remapped to the correct cascade-format UUIDs via
  `set_uuid` lookup + scale matching.
- **`packages/design-data/scripts/fix-replaced-by.mjs`**: audit script used to apply
  the remapping; kept for reference and future migration drift.
- **`packages/design-data/moon.yml`**: removed `runInCI: false` from the `validate` task
  now that SPEC-010 errors are resolved.
- **`sdk/core/src/validate/rules/spec018.rs`**: SPEC-018 now skips when no component
  catalog is loaded (empty graph), matching the intended semantics — the rule cannot
  validate component references against a catalog that was not provided.
- **`packages/design-data-spec/conformance/invalid/SPEC-018/dataset.json`**: updated
  fixture to use a non-empty component catalog so SPEC-018 fires for the right reason
  (referenced component not in the declared catalog).
