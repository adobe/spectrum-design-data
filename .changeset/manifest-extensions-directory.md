---
"@adobe/design-data-spec": major
---

Redefine platform-manifest `extensions` as a sibling `extensions/` directory (one file
per artifact) instead of a single inline object, so per-platform additions can scale
past a handful of components; the reference SDK loader is not yet updated (tracked
separately), so this change is spec+schema only in this release.

- **schemas/manifest.schema.json**: removed the inline `extensions` object; a manifest
  using the old inline shape now fails Layer 1 validation. Added optional
  `extensionsDir` (default `"extensions"`) and promoted `namingExceptions`/`formatting`
  to top-level manifest fields.
- **spec/manifest.md**: documents the `extensions/` directory layout, glob discovery,
  and merge/precedence rules (deep-merge for `tokens/`, sorted-path-order/last-wins for
  the other catalogs, override/remove-by-uuid for `relationships/`).
