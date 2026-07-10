---
"@adobe/spectrum-design-data": minor
"@adobe/spectrum-tokens": minor
"@adobe/design-data-tui": minor
---

Route tab-item, menu-item, and in-field-stepper anatomy sub-parts to their real parent
component, clearing 123 SPEC-009 warnings (part of spectrum-design-data-uep; remaining
71 tokens tracked separately pending a taxonomy ruling).

- **packages/design-data/registry/anatomy-terms.json**: add `in-field-stepper`; mark
  `tab-item`/`menu-item` `usedIn: ["tokens"]`.
- **packages/design-data/tokens/{layout,color}-component.tokens.json**: 123 tokens gain
  `component` (real parent: `tabs`, `menu`, `number-field`) + `anatomy` (sub-part) + a
  pinned `legacyKey` so the published key is unchanged.
- **packages/tokens/src/{layout,color}-component.json**: regenerated; only the flat
  `component` attribute value changed (67 tokens), no key renames.
- **packages/tokens/naming-exceptions.json** / **validation-snapshot.json**: track the
  49 tokens whose pinned legacy key no longer roundtrips through canonical name
  generation (category `anatomy-decomposition`).
- **packages/tokens/test/checkComponentProps.js**: recognize anatomy sub-part prefixes
  (via the anatomy registry) as valid even when they don't match `component`.
- **sdk/core/src/migrate.rs**: `thin_name_val` now pins `legacyKey` when a corrected
  `component` no longer reproduces the original key, fixing legacy→cascade roundtrip.
