---
"@adobe/design-data-spec": minor
"@adobe/spectrum-tokens": patch
"@adobe/design-data": patch
"@adobe/design-data-tui": minor
---

Token-type schemas and `naming-exceptions.json` now live in canonical packages.

- **design-data-spec/schemas**: authoritative `token-types/` and `token-file.json`, exported as
  `@adobe/design-data-spec/schemas/*`. `sync-token-schemas.mjs` generates copies; CI checks drift.
- **design-data/naming-exceptions.json**: moved here from `packages/tokens`.
- **packages/tokens**: `schemas/` and `naming-exceptions.json` are now generated copies.
- **docs/site/public/schemas**: regenerated, which updates six drifted files at the `$id` URLs.
- **sdk CLI**: resolves the new locations first, falls back to the old layout for older tags,
  and bumps the embedded snapshot layout.
- **tools/design-data**: `validate` resolves schemas through `@adobe/design-data-spec`.
