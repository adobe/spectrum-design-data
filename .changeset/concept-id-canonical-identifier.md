---
"@adobe/spectrum-tokens": minor
"@adobe/spectrum-design-data": major
"@adobe/design-data-spec": minor
"@adobe/design-data-tui": minor
---

Add a canonical `conceptId` UUID shared by every mode row of a design concept (closes the
concept-identity gap in proposal 013), and retire the transitional `set_uuid` cascade-migration
bridge field in the same release now that `conceptId` fully subsumes its role.

- **packages/tokens/schemas/token-types/alias.json**: removed `set_uuid`; `conceptId` was
  already documented alongside `uuid` on the token schema.
- **packages/design-data/tokens/\*.tokens.json**: backfilled `conceptId` on every token
  (reusing existing `set_uuid` values where present) and removed `set_uuid`.
- **sdk/core/src/{graph,legacy,migrate,figma/import}.rs**: re-keyed concept grouping,
  legacy-output reconstruction, migration, and Figma import onto `conceptId`; CTR-side
  camelCase `setUuid`/`setSchema` bridging is unchanged. `set_schema` is retained as-is —
  it encodes set-type, not concept identity.
- **sdk/core/src/validate/rules/spec059.rs** (new): `alias-mode-context-compatibility`,
  a mode analogue of SPEC-002 flagging an alias pinned to a mode-mismatched target.
- **spec/{cascade,token-format}.md**: normativize `conceptId` and context-aware `$ref`
  resolution against a `conceptId` anchor.
- **conformance fixtures**: renamed `set_uuid` → `conceptId` throughout.
