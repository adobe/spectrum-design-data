---
"@adobe/spectrum-tokens": minor
"@adobe/design-system-registry": patch
---

Icons name-object migration: structured `name` on family-scoped icon-color
tokens in `icons.json`.

- **icons.json**: 56 color-set tokens gain
  `name: { property: "icon-color", colorFamily, [object|variant|state] }`.
- **design-system-registry**: add `icon-color` to `property-terms.json`;
  regenerate `registry_data.rs`.
- **token-corpus-migrate**: add `iconColorNameForKey`; add `icons.json` to
  pilot scope.
- 23 alias tokens deferred — `colorFamily` is not permitted on `alias.json`
  by SPEC-042; follow-up will address when the alias name shape is defined.
