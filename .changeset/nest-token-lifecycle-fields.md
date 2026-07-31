---
"@adobe/spectrum-design-data": major
---

Nest token lifecycle fields under a single `lifecycle` object, matching the component
schema's existing `lifecycle` pattern (closes spectrum-design-data-u6w). `deprecated`
is renamed to `lifecycle.deprecatedIn` — the old name read as boolean-ish even though
it holds a version string. Legacy output (`@adobe/spectrum-tokens`) is unchanged;
`deprecated`/`deprecated_comment`/`renamed` there stay flat.

- **packages/design-data-spec/schemas/token.schema.json**: new `$defs.lifecycle`
  (`introduced`, `deprecatedIn`, `deprecatedComment`, `replacedBy`, `plannedRemoval`),
  referenced from `tokenWithValue`/`tokenWithRef` in place of the 5 removed flat fields.
- **packages/design-data-spec/schemas/component.schema.json**: renamed the existing
  `lifecycle.deprecated` to `lifecycle.deprecatedIn` so token and component schemas match.
- **packages/design-data/tokens/\*.tokens.json** (7 of 8 files): 1,323 tokens migrated
  from flat `deprecated`/`deprecated_comment`/`replaced_by`/`plannedRemoval`/`introduced`
  into the nested `lifecycle` object.
- **packages/design-data/scripts/migrate-lifecycle-nesting.js**: new re-runnable
  migration script.
- **sdk/core/src** (`legacy.rs`, `migrate.rs`, `diff.rs`, `authoring/{lifecycle,session}.rs`,
  `validate/rules/spec0{10,11,12,13,14,36,37}.rs`): retargeted to `lifecycle.*`.
