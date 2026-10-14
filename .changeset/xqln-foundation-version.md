---
"@adobe/design-data-spec": patch
---

Platform manifests pin `foundationVersion` to the canonical package (closes xqln.18).

- **platforms/**: pin `@adobe/spectrum-design-data@3.5.0` instead of `@adobe/spectrum-tokens`.
- **packages/design-data-spec/**: document the tag format in the manifest spec and schema.
- **sdk/cli/**: `platform show` drift check compares the version part of the tag.
