# Platform manifest

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the **platform manifest**: how a platform implementation repository declares its relationship to **foundation** design data — version pin, inclusion filters, typed overrides, and extensions.

## Capability matrix

The manifest supports a fixed, enumerated set of operations against the foundation — it does **not** allow overriding, aliasing, or removing arbitrary foundation artifacts. Support is concentrated on tokens; most other artifact types (guidelines, relationships/CTRs, exceptions, translations, schemas) have no manifest-level override mechanism at all.

| Operation                                                                               | Supported?                                                 | Field                           | Applies to            |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------- | --------------------- |
| Remove / exclude                                                                        | Yes                                                        | `exclude`                       | Tokens only           |
| Include / whitelist                                                                     | Yes                                                        | `include`                       | Tokens only           |
| Override value (type-preserving)                                                        | Yes                                                        | `overrides[].value`             | Tokens only           |
| Override → re-alias                                                                     | Yes                                                        | `overrides[].$ref`              | Tokens only           |
| Add new tokens (may alias via `$ref`)                                                   | Yes                                                        | `extensions.tokens`             | Tokens                |
| Add / replace components                                                                | Yes                                                        | `extensions.components`         | Components            |
| Add / replace field declarations                                                        | Yes                                                        | `extensions.fields`             | Fields                |
| Annotate existing terminology (cannot add new ids)                                      | Yes                                                        | `extensions.platformExtensions` | Existing registry ids |
| Restrict allowed mode-set values                                                        | Yes                                                        | `modeSetRestrictions`           | Mode sets             |
| Reformat name serialization                                                             | Schema-declared only, not yet applied by the reference SDK | `extensions.formatting`         | Token name strings    |
| Override/remove/alias guidelines, relationships/CTRs, exceptions, translations, schemas | No                                                         | —                               | —                     |

## Manifest document

A manifest **MUST** conform to [`manifest.schema.json`](../schemas/manifest.schema.json) (canonical `$id`: `https://opensource.adobe.com/spectrum-design-data/schemas/v0/manifest.schema.json`).

## Required fields

| Field               | Type   | Description                                                   |
| ------------------- | ------ | ------------------------------------------------------------- |
| `specVersion`       | string | **MUST** be `1.0.0-draft` for documents targeting this draft. |
| `foundationVersion` | string | Pin to a released foundation version (semver or tag string).  |

## Optional fields

| Field                 | Type            | Description                                                                                                                                                    |
| --------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `include`             | array of string | Semantic **queries** selecting subsets of foundation tokens to materialize.                                                                                    |
| `exclude`             | array of string | Queries removing tokens from the included set.                                                                                                                 |
| `overrides`           | array of object | Typed overrides; each entry **MUST** preserve the target token’s **value type**.                                                                               |
| `extensions`          | object          | Platform-local additions layered on top of foundation — `tokens`, `components`, `fields`, `platformExtensions`, `formatting` (see `extensions` section below). |
| `modeSetRestrictions` | object          | Mode set restrictions for this platform; see [Mode Sets — Platform restrictions](mode-sets.md#platform-restrictions).                                          |

### `include` / `exclude`

**NORMATIVE:** Each entry **MUST** be a non-empty string that parses as a valid query expression per [Query](query.md). An entry that fails to parse, or that references a key outside the [supported query key list](query.md#supported-keys), is a Layer 2 conformance error (SPEC-039 `manifest-query-parseable`).

See [Query — Formal grammar](query.md#formal-grammar) for the EBNF and [Query — Supported keys](query.md#supported-keys) for the normative list of allowed keys.

> **Migration note (from earlier `1.0.0-draft` revisions):** Prior revisions instructed implementations to treat manifest query values as opaque identifiers. That clause is lifted as of this revision. Any manifest that uses non-query strings in `include`/`exclude` must be updated to use valid query notation; the SPEC-039 rule reports column-level parse errors to guide migration.

### `overrides`

Each override object **MUST** include enough information to identify a target token and supply a replacement **value** or **$ref** compatible with the target’s type.

**NORMATIVE:** Overrides **MUST NOT** change the resolved type of the token (aligns with [Cascade — type safety](cascade.md)).

### `extensions`

**RECOMMENDED:** `extensions` follows the same structural conventions as foundation token files (tokens, mode sets) and **SHOULD** be validated with the same Layer 1 and Layer 2 rules.

#### `extensions.tokens`

Platform-local token definitions, in cascade-file format. Inserted at the platform layer alongside (not replacing) foundation tokens; entries **MAY** carry a `$ref` to alias an existing token instead of a literal value.

#### `extensions.components`

Platform-local component specs, injected into the component catalog. **NORMATIVE:** the reference SDK applies these add-or-replace by component `name` at the platform layer.

#### `extensions.fields`

Platform-local field declarations, injected into the field catalog. **NORMATIVE:** the reference SDK applies these add-or-replace by field `name` at the platform layer; each entry **MUST** validate against `field.schema.json`. Note: `extensions.formatting.conceptOrder` (if declared) references field names by string — a platform that renames or removes a field it also references there is self-inconsistent; that is a manifest-authoring concern, not enforced by the reference SDK.

#### `extensions.platformExtensions`

Platform terminology annotations layered onto **existing** foundation registry entries (for example, platform-specific state names). **NORMATIVE:** every `termId` **MUST** already exist in the referenced foundation registry — this mechanism annotates existing ids, it does **NOT** introduce new ones.

#### `extensions.formatting`

A platform **MAY** declare formatting rules that control how structured name objects are serialized into flat token name strings for that platform. See [Taxonomy — Platform formatting configuration](taxonomy.md#platform-formatting-configuration) for motivation and examples.

| Field           | Type            | Description                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `conceptOrder`  | array of string | Ordered list of name object field names for serialization. Each entry **MUST** be a declared field name from the design system's [field catalog](../fields/) (see [Token format — Name object](token-format.md#name-object)). Omitted fields are appended in the default order defined by each field declaration's `serialization.position` (see [Taxonomy — Default serialization](taxonomy.md#default-serialization-legacy-format)). |
| `casing`        | string          | One of: `kebab-case`, `camelCase`, `PascalCase`, `SCREAMING_SNAKE_CASE`. Default: `kebab-case`.                                                                                                                                                                                                                                                                                                                                        |
| `delimiter`     | string          | Character(s) separating concepts in the serialized string (e.g. `-`, `_`, `.`, `/`). Default: `-`.                                                                                                                                                                                                                                                                                                                                     |
| `abbreviations` | object          | Map of full term → abbreviated form (e.g. `{ "background": "bg" }`). Abbreviations are applied after concept ordering and before casing.                                                                                                                                                                                                                                                                                               |

**NORMATIVE:** When `extensions.formatting` is absent, the default serialization defined in [Taxonomy](taxonomy.md#default-serialization-legacy-format) is used.

**NORMATIVE:** A formatter applying `extensions.formatting` **MUST** produce deterministic output — the same name object and formatting configuration **MUST** always yield the same string.

## Validation

**NORMATIVE:** Manifests **MUST** pass Layer 1 JSON Schema validation.

**RECOMMENDED:** Validators resolve `foundationVersion` against a registry or lockfile and report mismatches as errors or warnings per product policy.

## Automated upgrades

**OPTIONAL:** Workflows **MAY** open upgrade PRs when `foundationVersion` lags the latest release; details are out of scope for this document (see [#715](https://github.com/adobe/spectrum-design-data/discussions/715)).

## Relationship to product context

The platform manifest is the Layer 2 context document. For Layer 3 (product-layer) context — rationale, overrides, and extensions specific to a product team's working copy — see [Product context](product-context.md).

## References

* [#715 — Distributed Design Data Architecture](https://github.com/adobe/spectrum-design-data/discussions/715)
* [#625 — Token Authoring Workflow](https://github.com/adobe/spectrum-design-data/discussions/625)
