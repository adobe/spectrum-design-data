# Platform manifest

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the **platform manifest**: how a platform implementation repository declares its relationship to **foundation** design data — version pin, inclusion filters, typed overrides, and extensions.

## Manifest document

A manifest **MUST** conform to [`manifest.schema.json`](../schemas/manifest.schema.json) (canonical `$id`: `https://opensource.adobe.com/spectrum-design-data/schemas/v0/manifest.schema.json`).

## Required fields

| Field               | Type   | Description                                                   |
| ------------------- | ------ | ------------------------------------------------------------- |
| `specVersion`       | string | **MUST** be `1.0.0-draft` for documents targeting this draft. |
| `foundationVersion` | string | Pin to a released foundation version (semver or tag string).  |

## Optional fields

| Field        | Type            | Description                                                                      |
| ------------ | --------------- | -------------------------------------------------------------------------------- |
| `include`    | array of string | Semantic **queries** selecting subsets of foundation tokens to materialize.      |
| `exclude`    | array of string | Queries removing tokens from the included set.                                   |
| `overrides`  | array of object | Typed overrides; each entry **MUST** preserve the target token’s **value type**. |
| `extensions` | object          | New tokens or dimensions introduced at the platform layer.                       |

### `include` / `exclude`

**NORMATIVE:** Entries **MUST** be non-empty strings. The **query language** is **not** normative in `1.0.0-draft`; treat values as opaque identifiers for tooling until a future spec version defines syntax.

### `overrides`

Each override object **MUST** include enough information to identify a target token and supply a replacement **value** or **$ref** compatible with the target’s type.

**NORMATIVE:** Overrides **MUST NOT** change the resolved type of the token (aligns with [Cascade — type safety](cascade.md)).

### `extensions`

**RECOMMENDED:** `extensions` follows the same structural conventions as foundation token files (tokens, dimensions) and **SHOULD** be validated with the same Layer 1 and Layer 2 rules.

## Validation

**NORMATIVE:** Manifests **MUST** pass Layer 1 JSON Schema validation.

**RECOMMENDED:** Validators resolve `foundationVersion` against a registry or lockfile and report mismatches as errors or warnings per product policy.

## Automated upgrades

**OPTIONAL:** Workflows **MAY** open upgrade PRs when `foundationVersion` lags the latest release; details are out of scope for this document (see [#715](https://github.com/adobe/spectrum-design-data/discussions/715)).

## References

* [#715 — Distributed Design Data Architecture](https://github.com/adobe/spectrum-design-data/discussions/715)
* [#625 — Token Authoring Workflow](https://github.com/adobe/spectrum-design-data/discussions/625)
