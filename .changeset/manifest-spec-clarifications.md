---
"@adobe/design-data-spec": patch
---

Clarify two manifest cascade behaviors surfaced by the iOS platform manifest POC.

- **spec/manifest.md**: documents that overrides land as new platform-layer records, not
  in-place edits (`query` double-counts an overridden token; only `resolve` picks the
  cascade winner), and recommends validators reject a pre-cascade-format `foundationVersion`.
