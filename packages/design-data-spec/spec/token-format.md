# Token format

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the normative **token** object: identity (`name`), either a literal **value** or an alias **`$ref`**, optional **metadata**, and **value types** validated by JSON Schema.

## Token object

A **token** is a JSON object that satisfies the Layer 1 schema [`token.schema.json`](../schemas/token.schema.json) (canonical `$id`: `https://opensource.adobe.com/spectrum-design-data/schemas/v0/token.schema.json`).

### Required shape

A token **MUST** contain:

1. **`name`** — a JSON object (the **name object**) as defined below.
2. Exactly one of:
   * **`value`** — a literal token value (type depends on value-type schema), or
   * **`$ref`** — a string reference to another token (alias).

A token **MUST NOT** include both `value` and `$ref`.

### Name object

The **name object** identifies the token in a structured way. Implementations use it for cascade matching, specificity, and tooling.

**NORMATIVE fields** (all string unless noted):

| Field           | Status   | Description                                                                                     |
| --------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `property`      | REQUIRED | Stable property key (e.g. semantic role of the token).                                          |
| `component`     | OPTIONAL | Component name when the token is component-scoped.                                              |
| `variant`       | OPTIONAL | Variant within a component.                                                                     |
| `state`         | OPTIONAL | Interactive or semantic state.                                                                  |
| `colorScheme`   | OPTIONAL | Dimension: light / dark / wireframe / etc.                                                      |
| `scale`         | OPTIONAL | Dimension: t-shirt size or density scale.                                                       |
| `contrast`      | OPTIONAL | Dimension: contrast level.                                                                      |
| Additional keys | OPTIONAL | Other dimensions declared in the dataset’s dimension catalog (see [Dimensions](dimensions.md)). |

**RECOMMENDED:** Name objects use a consistent key ordering in authored files for diffs; this is not a conformance requirement.

### Alias (`$ref`)

When **`$ref`** is present, the token is an **alias**. The value **MUST** be a non-empty string interpreted as a **token path** or **stable identifier** resolvable by the validator (resolution rules are Layer 2; see rule `SPEC-001` in `rules/rules.yaml`).

### Literal `value`

When **`value`** is present, it **MUST** conform to the declared value type for that token. Value types are defined under `schemas/value-types/` and referenced from the token schema.

### Lifecycle and metadata

The following OPTIONAL fields align with token lifecycle discussions (e.g. [#623](https://github.com/adobe/spectrum-design-data/discussions/623)):

| Field                | Type          | Description                                     |
| -------------------- | ------------- | ----------------------------------------------- |
| `uuid`               | string (UUID) | Stable unique id for rename tracking and diffs. |
| `introduced`         | string        | Version or date token was introduced.           |
| `deprecated`         | boolean       | Marked deprecated.                              |
| `deprecated_comment` | string        | Human-readable deprecation note.                |
| `status`             | string        | e.g. `experimental`, `stable`.                  |
| `renamed`            | string        | Previous name or id if renamed.                 |
| `private`            | boolean       | Not part of public API surface.                 |

**NORMATIVE:** If `deprecated` is `true`, `deprecated_comment` **SHOULD** be present.

### `specVersion`

**RECOMMENDED:** Root token documents (when stored as standalone JSON files) include `specVersion` with const `1.0.0-draft` for self-identification. Embedded tokens inside larger files **MAY** omit it if the parent document carries version metadata.

## Value types

Individual types (color, dimension, opacity, etc.) **MUST** be defined as JSON Schemas under `schemas/value-types/` and **MUST** use `$id` under the same `v0` base path as [Overview — JSON Schema `$id`](index.md).

## Relationship to legacy Spectrum tokens

The current `@adobe/spectrum-tokens` JSON uses **sets** (`color-set`, `scale-set`, …). This specification describes the **target** per-token model. Mapping from legacy to this format is out of scope for this document; see [#723](https://github.com/adobe/spectrum-design-data/issues/723).

## References

* [#646 — Token Schema Structure and Validation System](https://github.com/adobe/spectrum-design-data/discussions/646)
* [#623 — Token Lifecycle Metadata](https://github.com/adobe/spectrum-design-data/discussions/623)
