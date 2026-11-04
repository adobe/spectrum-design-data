---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Make the component changelog backfill reproducible.

- Duplicate relationship records without a uuid pair by file position.
- Token entries sort within each change group.
- A release's `commit` is the last commit before its Version Packages
  commit (the tag's first parent).
- Changelogs are regenerated to match.
