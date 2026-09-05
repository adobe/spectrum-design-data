# Platform manifest

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the **platform manifest**: how a platform implementation repository declares its relationship to **foundation** design data — version pin, inclusion filters, typed overrides, and extensions.

## Capability matrix

The manifest supports a fixed, enumerated set of operations against the foundation — it does **not** allow overriding, aliasing, or removing arbitrary foundation artifacts. Support is concentrated on tokens; translations and schemas have no manifest-level override mechanism at all.

| Operation                                          | Supported?                                                   | Field                             | Applies to            |
| -------------------------------------------------- | ------------------------------------------------------------ | --------------------------------- | --------------------- |
| Remove / exclude                                   | Yes                                                          | `exclude`                         | Tokens only           |
| Include / whitelist                                | Yes                                                          | `include`                         | Tokens only           |
| Override value (type-preserving)                   | Yes                                                          | `overrides[].value`               | Tokens only           |
| Override → re-alias                                | Yes                                                          | `overrides[].$ref`                | Tokens only           |
| Add new tokens (may alias via `$ref`)              | Yes                                                          | `extensions/tokens/`              | Tokens                |
| Add / replace components                           | Yes                                                          | `extensions/components/`          | Components            |
| Add / replace field declarations                   | Yes                                                          | `extensions/fields/`              | Fields                |
| Add / replace guideline documents                  | Yes                                                          | `extensions/guidelines/`          | Guidelines            |
| Add relationships/CTRs; override/remove by `uuid`  | Yes                                                          | `extensions/relationships/`       | Relationships (CTRs)  |
| Add / remove naming exceptions                     | Yes                                                          | `namingExceptions`                | Naming validation     |
| Annotate existing terminology (cannot add new ids) | Yes                                                          | `extensions/platform-extensions/` | Existing registry ids |
| Restrict allowed mode-set values                   | Yes                                                          | `modeSetRestrictions`             | Mode sets             |
| Reformat name serialization                        | Schema-declared only, not yet applied by the reference SDK   | `formatting`                      | Token name strings    |
| Override/remove/alias translations                 | No                                                           | —                                 | —                     |
| Override Layer-1 schemas                           | No (decided; see [spike](manifest-schema-override-spike.md)) | —                                 | —                     |

## Manifest document

A manifest **MUST** conform to [`manifest.schema.json`](../schemas/manifest.schema.json) (canonical `$id`: `https://opensource.adobe.com/spectrum-design-data/schemas/v0/manifest.schema.json`).

## Required fields

| Field               | Type   | Description                                                   |
| ------------------- | ------ | ------------------------------------------------------------- |
| `specVersion`       | string | **MUST** be `1.0.0-draft` for documents targeting this draft. |
| `foundationVersion` | string | Pin to a released foundation version (semver or tag string).  |

## Optional fields

| Field                 | Type            | Description                                                                                                                                                     |
| --------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `include`             | array of string | Semantic **queries** selecting subsets of foundation tokens to materialize.                                                                                     |
| `exclude`             | array of string | Queries removing tokens from the included set.                                                                                                                  |
| `overrides`           | array of object | Typed overrides; each entry **MUST** preserve the target token’s **value type**.                                                                                |
| `extensionsDir`       | string          | Path (relative to the manifest) to the platform's `extensions/` directory. Default: `"extensions"`. See [`extensions/` directory](#extensions-directory) below. |
| `namingExceptions`    | object          | Platform-local overlay on the base naming-exceptions set: names to add and/or remove for this platform's naming validation.                                     |
| `formatting`          | object          | Rules for serializing structured name objects into platform-specific token name strings.                                                                        |
| `modeSetRestrictions` | object          | Mode set restrictions for this platform; see [Mode Sets — Platform restrictions](mode-sets.md#platform-restrictions).                                           |

### `include` / `exclude`

**NORMATIVE:** Each entry **MUST** be a non-empty string that parses as a valid query expression per [Query](query.md). An entry that fails to parse, or that references a key outside the [supported query key list](query.md#supported-keys), is a Layer 2 conformance error (SPEC-039 `manifest-query-parseable`).

See [Query — Formal grammar](query.md#formal-grammar) for the EBNF and [Query — Supported keys](query.md#supported-keys) for the normative list of allowed keys.

> **Migration note (from earlier `1.0.0-draft` revisions):** Prior revisions instructed implementations to treat manifest query values as opaque identifiers. That clause is lifted as of this revision. Any manifest that uses non-query strings in `include`/`exclude` must be updated to use valid query notation; the SPEC-039 rule reports column-level parse errors to guide migration.

### `overrides`

Each override object **MUST** include enough information to identify a target token and supply a replacement **value** or **$ref** compatible with the target’s type.

**NORMATIVE:** Overrides **MUST NOT** change the resolved type of the token (aligns with [Cascade — type safety](cascade.md)).

An override is applied as a new **platform-layer** record, not an in-place edit of the
foundation record it targets — the original foundation record is left untouched.
[Query](query.md) reports records across all cascade layers, so a query over an overridden
token's selector returns both the untouched foundation record and the new platform-layer
record (e.g. an override on a `state=disabled` token increases the matching count by one,
rather than replacing an existing match). Only [`resolve` / `resolve_property`](cascade.md)
apply `Foundation < Platform < Product` precedence to select a single winner. Tooling that
counts "tokens a platform ships" from `query` output should resolve first, or it will
double-count overridden tokens.

### `extensions/` directory

**NORMATIVE:** Platform-local additions are declared as a sibling **directory** next to
`manifest.json` (default name `extensions/`; override with the top-level `extensionsDir`
field), not as an inline object in the manifest. This mirrors how the foundation dataset
(`packages/design-data/`) splits its own catalogs into one file per artifact, and lets a
platform's extension set grow without every addition colliding in one JSON object.

```
extensions/
  tokens/               *.tokens.json          cascade-format token files
  components/           <component>.json       one component per file
  fields/                <field>.json          one field declaration per file
  relationships/         <component>.json      one CTR set per file
  guidelines/             <topic>.json         one guideline per file
  platform-extensions/   <platform>-<registry>.json
```

**NORMATIVE:** Each subdirectory is discovered by a recursive glob for `*.json` files (for
`tokens/`, `**/*.tokens.json`), with no index file — the same convention used by
`discover_json_files` in `sdk/core/src/discovery.rs` for the foundation dataset. Matched files
are processed in **sorted path order**; this is the sole basis for precedence below. A missing
or empty subdirectory contributes nothing and is not an error.

**NORMATIVE:** Merge semantics by subdirectory:

* **`tokens/`** — every `*.tokens.json` file is cascade-format (same shape as a foundation
  cascade token file) and **MUST** validate against `cascade-file.schema.json`. Files are
  **deep-merged** into one tokens object, in sorted path order. Entries **MAY** carry a `$ref`
  to alias an existing token instead of a literal value.
* **`components/`, `fields/`, `guidelines/`, `platform-extensions/`** — one artifact per file.
  Entries across all files in the subdirectory are concatenated, in sorted path order, and
  injected into the corresponding catalog **add-or-replace by name** (for
  `platform-extensions/`, by `termId`; see below). When two files declare the same name,
  **the entry from the later file (in sorted path order) wins.**

**NORMATIVE:** Each fragment file **MUST** validate against its category's real JSON schema at
load time — this is enforced reference-SDK behavior, not an aspirational goal:

* **`components/`** → `component.schema.json`
* **`fields/`** → `field.schema.json` (see [`extensions/fields/`](#extensionsfields) below)
* **`guidelines/`** → `guideline.schema.json`
* **`relationships/`** → `relationship.schema.json` (see the Add/Override/remove rules above)
* **`platform-extensions/`** → `platform-extension.json` (see
  [`extensions/platform-extensions/`](#extensionsplatform-extensions) below)
* **`tokens/`** → `cascade-file.schema.json` (see above)

A fragment that fails validation against its category schema is a manifest error — the
reference SDK rejects the load rather than silently skipping the malformed file.

* **`relationships/`** — Component/Token Relationship (CTR) entries. Relationships have no
  inherent stable key — only an optional `uuid` — so add and override/remove use different
  identity rules:
  * **Add:** an entry with no `op` field is a full relationship object (validated against
    `relationship.schema.json`), appended at the platform layer, in sorted path order.
  * **Override / remove:** targeting an existing relationship **MUST** carry a `uuid`.
    **NORMATIVE:** an entry with `"op": "override"` or `"op": "remove"` that omits `uuid` is a
    manifest error — the reference SDK rejects it rather than silently skipping it. `"op":
    "override"` also carries a `value` (the replacement relationship object); `"op": "remove"`
    drops the matching record. Override/remove ops apply, in sorted path order, against the
    accumulated set of added relationships (across all files, foundation and platform-local).

#### `extensions/fields/`

Platform-local field declarations, injected into the field catalog. **NORMATIVE:** each file
**MUST** validate against `field.schema.json`. Note: a top-level `formatting.conceptOrder` (if
declared) references field names by string — a platform that renames or removes a field it
also references there is self-inconsistent; that is a manifest-authoring concern, not enforced
by the reference SDK.

#### `extensions/platform-extensions/`

Platform terminology annotations layered onto **existing** foundation registry entries (for
example, platform-specific state names). **NORMATIVE:** each file **MUST** validate against
`platform-extension.json`, and every `termId` **MUST** already exist in the referenced
foundation registry — this mechanism annotates existing ids, it does **NOT** introduce new
ones.

### `namingExceptions`

Platform-local overlay on the base naming-exceptions set used by naming validation.
**NORMATIVE:** the reference SDK applies `remove` before `add`, so a name listed in both
ends up present (add wins) rather than silently dropped. Absent this key, the base set
(embedded or file-loaded) is used unchanged.

| Field    | Type            | Description                                                  |
| -------- | --------------- | ------------------------------------------------------------ |
| `add`    | array of string | Names to add to the naming-exceptions set for this platform. |
| `remove` | array of string | Names to remove from the base naming-exceptions set.         |

### `formatting`

A platform **MAY** declare formatting rules that control how structured name objects are serialized into flat token name strings for that platform. See [Taxonomy — Platform formatting configuration](taxonomy.md#platform-formatting-configuration) for motivation and examples.

| Field           | Type            | Description                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `conceptOrder`  | array of string | Ordered list of name object field names for serialization. Each entry **MUST** be a declared field name from the design system's [field catalog](../fields/) (see [Token format — Name object](token-format.md#name-object)). Omitted fields are appended in the default order defined by each field declaration's `serialization.position` (see [Taxonomy — Default serialization](taxonomy.md#default-serialization-legacy-format)). |
| `casing`        | string          | One of: `kebab-case`, `camelCase`, `PascalCase`, `SCREAMING_SNAKE_CASE`. Default: `kebab-case`.                                                                                                                                                                                                                                                                                                                                        |
| `delimiter`     | string          | Character(s) separating concepts in the serialized string (e.g. `-`, `_`, `.`, `/`). Default: `-`.                                                                                                                                                                                                                                                                                                                                     |
| `abbreviations` | object          | Map of full term → abbreviated form (e.g. `{ "background": "bg" }`). Abbreviations are applied after concept ordering and before casing.                                                                                                                                                                                                                                                                                               |

**NORMATIVE:** When `formatting` is absent, the default serialization defined in [Taxonomy](taxonomy.md#default-serialization-legacy-format) is used.

**NORMATIVE:** A formatter applying `formatting` **MUST** produce deterministic output — the same name object and formatting configuration **MUST** always yield the same string.

## Validation

**NORMATIVE:** Manifests **MUST** pass Layer 1 JSON Schema validation.

**RECOMMENDED:** Validators resolve `foundationVersion` against a registry or lockfile and report mismatches as errors or warnings per product policy.

**RECOMMENDED:** Validators confirm the resolved `foundationVersion` provides a cascade-format
dataset (`packages/design-data/*`), not a pre-cascade legacy release predating the structured
`name` object, mode sets, and UUIDs — a manifest cascaded against a pre-cascade pin is not
meaningful. Report a pre-cascade pin as an error per product policy.

## Automated upgrades

**OPTIONAL:** Workflows **MAY** open upgrade PRs when `foundationVersion` lags the latest release; details are out of scope for this document (see [#715](https://github.com/adobe/spectrum-design-data/discussions/715)).

## Relationship to product context

The platform manifest is the Layer 2 context document. For Layer 3 (product-layer) context — rationale, overrides, and extensions specific to a product team's working copy — see [Product context](product-context.md).

## References

* [#715 — Distributed Design Data Architecture](https://github.com/adobe/spectrum-design-data/discussions/715)
* [#625 — Token Authoring Workflow](https://github.com/adobe/spectrum-design-data/discussions/625)
* [Schema-override spike](manifest-schema-override-spike.md) — why the manifest cascade does not allow platform overrides of Layer-1 schemas
