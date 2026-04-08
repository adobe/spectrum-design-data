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

The set of available name-object fields is declared in the design system's **field catalog** (`fields/` directory). Each field declaration conforms to [`field.schema.json`](../schemas/field.schema.json) and specifies its kind (`semantic` or `dimension`), vocabulary registry, validation severity, and default serialization position. See [Taxonomy](taxonomy.md) for the full concept category hierarchy, component anatomy vs. token objects, and serialization rules.

Fields are divided into **semantic fields** (identity, structure, intent) and **dimension fields** (axes of variation for cascade resolution). The tables below list Spectrum's foundation-standard fields as declared in the catalog.

#### Semantic fields

| Field          | Status   | Taxonomy category | Description                                                                                                                                                              |
| -------------- | -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `property`     | REQUIRED | Property          | The stylistic attribute being defined (e.g. `color`, `width`, `padding`, `gap`).                                                                                         |
| `component`    | OPTIONAL | Component         | Component name when the token is component-scoped.                                                                                                                       |
| `structure`    | OPTIONAL | Structure         | Reusable visual pattern or object category (e.g. `base`, `container`, `list`, `accessory`). Distinct from `component`.                                                   |
| `substructure` | OPTIONAL | Sub-structure     | A structure that only exists within its parent structure (e.g. `item` in `list-item`).                                                                                   |
| `anatomy`      | OPTIONAL | Anatomy           | A visible, named part of a component as defined by designers (e.g. `handle`, `icon`, `label`). See [Taxonomy — Component anatomy](taxonomy.md#component-anatomy).        |
| `object`       | OPTIONAL | Object            | Styling surface to which a visual property is applied (e.g. `background`, `border`, `edge`). See [Taxonomy — Token objects](taxonomy.md#token-objects-styling-surfaces). |
| `variant`      | OPTIONAL | Variant           | Variant within a component (e.g. `accent`, `negative`, `primary`).                                                                                                       |
| `state`        | OPTIONAL | State             | Interactive or semantic state (e.g. `hover`, `focus`, `disabled`).                                                                                                       |
| `orientation`  | OPTIONAL | Orientation       | Direction or order of structures and elements (e.g. `vertical`, `horizontal`).                                                                                           |
| `position`     | OPTIONAL | Position          | Location of an object relative to another (e.g. `affixed`).                                                                                                              |
| `size`         | OPTIONAL | Size              | Relative t-shirt sizing for relationships across tokens (e.g. `small`, `medium`, `large`).                                                                               |
| `density`      | OPTIONAL | Density           | Space within or around component parts (e.g. `spacious`, `compact`).                                                                                                     |
| `shape`        | OPTIONAL | Shape             | Relative to overall component shape (e.g. `uniform`).                                                                                                                    |

#### Dimension fields

| Field           | Status   | Description                                                                                     |
| --------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `colorScheme`   | OPTIONAL | Dimension: light / dark / wireframe / etc.                                                      |
| `scale`         | OPTIONAL | Dimension: platform density scale (e.g. `desktop`, `mobile`). Distinct from semantic `size`.    |
| `contrast`      | OPTIONAL | Dimension: contrast level (e.g. `regular`, `high`).                                             |
| Additional keys | OPTIONAL | Other dimensions declared in the dataset’s dimension catalog (see [Dimensions](dimensions.md)). |

**NORMATIVE:** Each field is validated according to the `validation` severity declared in its field declaration. Semantic fields typically use **advisory** severity (warning); dimension fields use **strict** severity (error). See [Taxonomy — Name object field categories](taxonomy.md#name-object-field-categories).

**RECOMMENDED:** Name objects use a consistent key ordering in authored files for diffs; this is not a conformance requirement. Concept ordering for serialized names is defined in [Taxonomy — Default serialization](taxonomy.md#default-serialization-legacy-format).

### Alias (`$ref`)

When **`$ref`** is present, the token is an **alias**. The value **MUST** be a non-empty string interpreted as a **token path** or **stable identifier** resolvable by the validator (resolution rules are Layer 2; see rule `SPEC-001` in `rules/rules.yaml`).

### Literal `value`

When **`value`** is present, it **MUST** conform to the declared value type for that token. Value types are defined under `schemas/value-types/` and referenced from the token schema.

### Lifecycle and metadata

The following OPTIONAL fields implement the token lifecycle model described in [#623](https://github.com/adobe/spectrum-design-data/discussions/623) and the evolution policy in [Evolution](evolution.md). Inspired by Swift's `@available` attribute, Kotlin's `@Deprecated`, and OpenAPI 3.3's deprecation model.

| Field                | Type                                    | Description                                                                                                     |
| -------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `uuid`               | string (UUID)                           | Stable unique id for rename tracking and diffs.                                                                 |
| `introduced`         | string (version)                        | Spec version when the token was first added (e.g. `"1.0.0"`).                                                   |
| `deprecated`         | string (version)                        | Spec version when the token was deprecated (e.g. `"3.2.0"`). Truthy = deprecated.                               |
| `deprecated_comment` | string                                  | Human-readable deprecation explanation and migration guidance.                                                  |
| `replaced_by`        | string (UUID) or array of string (UUID) | UUID(s) of the replacement token(s). Single string for 1:1 replacement; array for one-to-many splits.           |
| `plannedRemoval`     | string (version)                        | Spec version when the token will be removed. If omitted, defaults to the next major version after `deprecated`. |
| `private`            | boolean                                 | Not part of public API surface.                                                                                 |

#### Lifecycle example

```json
{
  "name": { "component": "button", "object": "background", "property": "color", "variant": "primary" },
  "value": "#0265dc",
  "uuid": "aaaaaaaa-0001-4000-8000-000000000001",
  "introduced": "1.0.0",
  "deprecated": "3.2.0",
  "deprecated_comment": "Use action-background-default instead.",
  "replaced_by": "bbbbbbbb-0002-4000-8000-000000000001",
  "plannedRemoval": "4.0.0"
}
```

#### Normative rules

**NORMATIVE:** If `deprecated` is present, `deprecated_comment` **SHOULD** be present.

**NORMATIVE:** If `replaced_by` is an array, `deprecated_comment` is **REQUIRED** — the comment **MUST** explain which replacement applies in which context.

**NORMATIVE:** If `replaced_by` is present, `deprecated` **MUST** be present.

**NORMATIVE:** If `plannedRemoval` is present, `deprecated` **MUST** be present, and the `plannedRemoval` version **MUST NOT** precede the `deprecated` version.

**NORMATIVE:** Each UUID in `replaced_by` **MUST** resolve to an existing token in the dataset (see rule `SPEC-010`).

#### Legacy format mapping

When generating legacy-format output from cascade tokens:

* `deprecated: "3.2.0"` maps to `deprecated: true`
* `replaced_by: "<uuid>"` maps to `renamed: "<target-token-name>"` (resolved via UUID lookup)
* `introduced` and `plannedRemoval` have no legacy equivalent and are not emitted

When migrating legacy-format tokens to cascade:

* `deprecated: true` maps to `deprecated: "unknown"` (authors should backfill the actual version)
* `renamed: "<name>"` maps to `replaced_by: "<uuid>"` (resolved via name lookup across all files in the migrated input set). If the rename target is not found in the scanned corpus, the field is dropped — `replaced_by` must be set manually in that case

### `specVersion`

**RECOMMENDED:** Root token documents (when stored as standalone JSON files) include `specVersion` with const `1.0.0-draft` for self-identification. Embedded tokens inside larger files **MAY** omit it if the parent document carries version metadata.

## Document shape

Cascade-format tokens are stored in **JSON files** that conform to [`cascade-file.schema.json`](../schemas/cascade-file.schema.json) (canonical `$id`: `https://opensource.adobe.com/spectrum-design-data/schemas/v0/cascade-file.schema.json`).

**NORMATIVE:** A cascade file **MUST** be a JSON **array** of token objects. Each element **MUST** conform to [`token.schema.json`](../schemas/token.schema.json).

**NORMATIVE:** The array is **ordered**. Document order is used for tie-breaking during cascade resolution (earlier element wins); see [Cascade — Semantic specificity](cascade.md#semantic-specificity).

**RECOMMENDED:** A cascade file uses the `.tokens.json` extension to distinguish it from legacy set-format files.

Example:

```json
[
  { "name": { "object": "background", "property": "color" }, "value": "#f5f5f5", "uuid": "..." },
  { "name": { "object": "background", "property": "color", "colorScheme": "dark" }, "value": "#1e1e1e", "uuid": "..." }
]
```

## Value types

Individual types (color, dimension, opacity, etc.) **MUST** be defined as JSON Schemas under `schemas/value-types/` and **MUST** use `$id` under the same `v0` base path as [Overview — JSON Schema `$id`](index.md).

## Relationship to legacy Spectrum tokens

The current `@adobe/spectrum-tokens` JSON uses **sets** (`color-set`, `scale-set`, …). This specification describes the **target** per-token model. Mapping from legacy to this format is out of scope for this document; see [#743](https://github.com/adobe/spectrum-design-data/issues/743).

## Relationship to RFC [#646](https://github.com/adobe/spectrum-design-data/issues/646) token shape

[RFC #646](https://github.com/adobe/spectrum-design-data/discussions/646) proposed an analytical token shape during the design process. This spec defines the **canonical serialization format**. The two are related but not identical:

| Aspect              | RFC [#646](https://github.com/adobe/spectrum-design-data/issues/646) shape | This spec                                                                  |
| ------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Identity field      | `id`                                                                       | `uuid`                                                                     |
| Name model          | `name.original` (string) + `name.structure` (nested object)                | Flat fields directly on `name` (`property`, `component`, `colorScheme`, …) |
| Complexity tracking | `name.semanticComplexity` (stored on token)                                | Computed at validation time from dimension declarations                    |

**NORMATIVE:** The flat `name` object defined in this spec is the authoritative serialization format. RFC [#646](https://github.com/adobe/spectrum-design-data/issues/646)'s `name.structure` / `name.original` shape is not a conformance target; it remains a useful reference for the analytical model that informed this design.

RFC [#646](https://github.com/adobe/spectrum-design-data/issues/646) remains open as a historical reference. It is not superseded; the spec evolved the format during Phase 2 based on implementation experience.

## References

* [#646 — Token Schema Structure and Validation System](https://github.com/adobe/spectrum-design-data/discussions/646)
* [#623 — Token Lifecycle Metadata](https://github.com/adobe/spectrum-design-data/discussions/623)
* [#756 — Phase 2: Cascade token file schema](https://github.com/adobe/spectrum-design-data/issues/756)
* [#759 — Phase 2: Token shape reconciliation](https://github.com/adobe/spectrum-design-data/issues/759)
