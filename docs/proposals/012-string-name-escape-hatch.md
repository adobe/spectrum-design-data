# Proposal 012: String-Name Escape Hatch

**Status:** Draft\
**Affects:** token.schema.json, token-format.md, rules.yaml, Rust SDK validator\
**Spec reference:** token-format.md — token name

## Problem

The name-object taxonomy covers the vast majority of Spectrum tokens, but a
small set of tokens cannot be decomposed into the structured fields. Examples
include legacy compound-state tokens (`focus-ring-color-key-focus`), tokens
whose meaning is encoded in a vendor-prefixed string, or tokens migrated from
external systems whose naming conventions do not map to the taxonomy.

Currently these tokens are tracked in `packages/tokens/naming-exceptions.json`
as informal tech debt — 730+ entries across categories like `compound-state`,
`typography-*`, `state-position`, and others. There is no formal spec concept
that lets tooling discover these tokens, report them consistently, or plan for
their remediation.

## Prior Art

**CSS `!important`** — allowed by the spec but signals a shortcut that should
be resolved by improving the cascade, not accepted as the final design. Use is
tracked, flagged by linters, and treated as a signal to refactor.

**TypeScript `any`** — a valid escape hatch for values whose types cannot be
expressed yet. TypeScript's `--strict` mode and linters flag it as a smell.
`naming-exceptions.json` plays the same role today but is tooling-internal and
not part of the spec.

## Proposal

Allow a token's `name` field to be either a **name object** (current) or a
**plain string** (new escape hatch). String-named tokens:

* **Are schema-valid** — they pass `token.schema.json` structural validation.
* **Trigger SPEC-017** (severity: `warning`, category: `tech-debt`) —
  surfaced in conformance reports so the debt is visible.
* **Do not participate** in name-object decomposition, cascade dimension
  matching by name, or registry vocabulary checks (SPEC-009 does not apply).

### Schema change

`name` becomes a `oneOf` union:

```json
"name": {
  "oneOf": [
    { "$ref": "#/$defs/nameObject" },
    { "type": "string", "minLength": 1 }
  ]
}
```

### SPEC-017 rule

| Field      | Value                                                         |
| ---------- | ------------------------------------------------------------- |
| `id`       | `SPEC-017`                                                    |
| `name`     | `string-name-tech-debt`                                       |
| `severity` | `warning`                                                     |
| `category` | `tech-debt`                                                   |
| `assert`   | Token names SHOULD be structured name objects. A plain string |
|            | name is permitted as a temporary escape hatch but MUST be     |
|            | treated as tech debt and tracked for remediation.             |
| `message`  | `Token "{name}" uses a string name instead of a name object`  |
| `spec_ref` | `spec/token-format.md#string-name-escape-hatch`               |

### Remediation path

String-named tokens map directly to entries in `naming-exceptions.json`. A
token is considered remediated when its `name` is changed to a valid name
object — at that point it is removed from `naming-exceptions.json` and SPEC-017
no longer fires for it.

Tooling that consumes name objects MUST handle `null` / missing decomposition
gracefully when it encounters a string name.

## Impact

* **Zero breaking changes** — `name` remains valid for all existing
  object-named tokens; string names are a new allowed form.
* **Schema change** — `token.schema.json` `tokenWithValue` and `tokenWithRef`
  both updated.
* **New rule** — SPEC-017 in `rules.yaml` and `sdk/core/src/validate/rules/`.
* **Conformance fixtures** — valid string-name token (fires SPEC-017) and an
  explicit test that object-named tokens do not fire SPEC-017.

## Open Questions

1. **Cascade dimension matching** — should a string-named token be resolvable
   via dimension-keyed cascade lookups at all? (Current answer: no — string
   names have no dimension fields, so they match only as global defaults with
   specificity zero.)

2. **UUID requirement** — should string-named tokens be required to have a
   `uuid`? (Current answer: same as object-named tokens — required by
   `token.schema.json`'s `required` array, no change needed.)

3. **Migration to `naming-exceptions.json`** — should the CLI gain a command
   to auto-generate string-name tokens from `naming-exceptions.json` entries?
   Deferred to a follow-up proposal.
