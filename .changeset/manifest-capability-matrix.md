---
"@adobe/design-data-spec": patch
---

Document the full platform manifest capability matrix and fill in missing `extensions` sub-keys.

- **spec/manifest.md**: adds a capability matrix (what a platform manifest
  can override, alias, add, or remove, and what it can't) and documents
  `extensions.tokens`, `extensions.components`, and
  `extensions.platformExtensions`, previously undocumented despite being
  applied by the SDK.
