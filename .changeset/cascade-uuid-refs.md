---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": minor
"@adobe/design-data": minor
---
Migrate cascade token `$ref` aliases from name strings to UUIDs.

- **packages/design-data/tokens/\*.tokens.json**: alias `$ref` now holds the
  target's UUID (rename-proof, cascade canonical). Legacy `packages/tokens/src`
  is unchanged — roundtrip-verify stays clean.
- **sdk/core/src/graph.rs**: add `resolve_alias_key` (UUID-first + slug + legacy-
  name-index fallback); fix cycle-guard to key on resolved graph key; index
  `set_uuid` so set-targeted aliases resolve.
- **sdk/core/src/migrate.rs**: emit UUID `$ref` via `global_name_to_uuid`;
  add `MigrateSummary.dangling_alias_refs` counter.
- **sdk/core/src/legacy.rs**: denormalize UUID `$ref` → `{name}` via
  `global_uuid_to_name` so legacy output is byte-semantically identical.
- **sdk/core/src/validate/rules/spec001–003,015,042**: route alias lookups
  through `resolve_alias_key` for correct UUID resolution.
- **packages/tokens/schemas/token-types/alias.json**: accept `value: "{name}"`
  (legacy) or `$ref: "<uuid>"` (cascade) via `oneOf`.
- **packages/design-data-spec/schemas/token.schema.json**, **spec/token-format.md**:
  document UUID as the cascade canonical `$ref`; activate the reserved direction.
