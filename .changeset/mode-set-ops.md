---
"@adobe/design-data-spec": minor
---

Platform manifests can now add, remove, or retarget a single mode value (or remove a whole
set) in `extensions/mode-sets/` via an `op` field, instead of only declaring or replacing
the entire set.

- **spec/manifest.md**: documented the `addMode` / `removeMode` / `setDefault` / `remove`
  op grammar and updated the capability matrix.
- **spec/mode-sets.md**: cross-referenced the new ops alongside the existing
  declare-or-replace semantics.
- **conformance/manifest-extensions/**: added valid and invalid fixtures covering each op.
