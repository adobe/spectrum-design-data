---
"@adobe/spectrum-design-data": minor
---

Add a first-class `icon` name field (part of spectrum-design-data-p89), the Rust
prerequisite for re-keying icon tokens off `component` to clear ~315 SPEC-009 warnings.
No token data changes yet — `icon` is not used by any token in this change.

- **packages/design-data/fields/icon.json**: new field, registry-backed, advisory.
- **packages/design-data/registry/icon-terms.json**: 12 icon ids (`icon`, `ui`,
  `checkmark`, `chevron`, `dash`, `arrow`, `cross`, `add`, `link-out`, `drag-handle`,
  `asterisk`, `gripper`), with `tokenName` long-form expansions for legacy keys.
- **sdk/core/src/naming.rs**: `extract_legacy_key` treats `icon` as an alternate,
  mutually-exclusive owner to `component` — both in the color-domain branch
  (`{icon}-{property}-{colorFamily?}-{colorRole?}-{state?}`) and a new non-color branch
  (`{icon-tokenName}-{property}-{state?}`) for layout/dimension icon tokens.
