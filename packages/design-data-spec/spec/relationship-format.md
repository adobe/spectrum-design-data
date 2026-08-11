# Relationship format (Component/Token Relationship — CTR)

## Overview

A Component/Token Relationship (CTR) is an anonymous token that unifies the two mechanisms that today independently connect components and tokens:

1. **`tokenBindings`** on a component declaration (component-declares-usage direction; see [component-format.md#token-bindings](component-format.md#token-bindings)).
2. **Name-object scope fields** on a token (`component`, `variant`, `anatomy`, `state`, and arbitrary option keys; token-declares-scope direction, validated today by SPEC-018, SPEC-019, SPEC-020, SPEC-022, and SPEC-040).

Rather than encoding component/part/option context inside a token's `name` string, a CTR carries its value (or `$ref` alias) alongside an explicit `scope` object naming the component, part, property, and option scope it belongs to, plus an optional `context` string carrying a human-readable label (the same role `tokenBindings[].context` plays today — e.g. mapping to a Figma Token Group label). CTR entries live under `relationships/*.json`, each file a JSON array of CTR objects (see [`relationship.schema.json`](../schemas/relationship.schema.json)).

**NORMATIVE:** This document defines the CTR **foundation** — shape, validation rules, and interim legacy-compatibility fields. It does not migrate existing token or component data; `tokenBindings` and `componentBindings` remain in the schemas and are **NOT** removed by this chapter (deferred to a future migration phase).

## Shape

Each CTR is one of two subtypes, mirroring the token `oneOf` split (see [token-format.md](token-format.md)):

* **Value-owning CTR** (`ctrWithValue`) — carries a literal `value`, like a token.
* **Relationship-only CTR** (`ctrWithRef`) — carries a `$ref` alias to another token or CTR `uuid`, instead of an owned value.

```json
[
  {
    "scope": {
      "component": "button",
      "part": "label",
      "property": "color",
      "options": { "variant": "accent", "state": ["hover"] }
    },
    "context": "Label color, accent variant, hover",
    "value": "#0060e0",
    "uuid": "5b1a8e2e-9e2f-4b7a-9b2e-1a2b3c4d5e6f"
  },
  {
    "scope": {
      "component": "checkbox",
      "property": "corner-radius"
    },
    "$ref": "5b1a8e2e-9e2f-4b7a-9b2e-1a2b3c4d5e6f"
  }
]
```

## Scope fields

| Field             | Required | Type   | Description                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------- | -------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scope.component` | yes      | string | Component name (kebab-case). **MUST** match the `name` of a declared component in the dataset (rule SPEC-051, mirrors SPEC-018).                                                                                                                                                                                                                                                     |
| `scope.part`      | no       | string | Anatomy part name. **MUST** match a declared anatomy part on the referenced component when present (rule SPEC-052, mirrors SPEC-020).                                                                                                                                                                                                                                                |
| `scope.property`  | yes      | string | The stylistic attribute this relationship describes (e.g. `color`, `width`, `padding`).                                                                                                                                                                                                                                                                                              |
| `scope.options`   | no       | object | Option-scoped narrowing. Each `options.<key>` value **MUST** validate against the referenced component's `options.<key>.values` (rule SPEC-053 — the headline CTR rule, stricter than the token-side SPEC-040 warning). `options.state` is the exception: an ordered array of atomic state ids, validated against the component's declared states (rule SPEC-054, mirrors SPEC-022). |
| `context`         | no       | string | Human-readable label for how this CTR is used (mirrors `tokenBindings[].context`; maps to a Figma Token Group label). Purely descriptive — not validated.                                                                                                                                                                                                                            |

Layer 1 (`relationship.schema.json`) only enforces shape: `scope.options` is an object, `scope.options.state` (when present) is an array of strings, and other option values are typically strings. It does **not** enforce which option values are valid — that is a Layer 2 (Rust, `sdk/core`) relational rule, because it requires cross-referencing the component catalog.

## Value-owning vs. relationship-only

| Field   | Subtype        | Description                                                                                                        |
| ------- | -------------- | ------------------------------------------------------------------------------------------------------------------ |
| `value` | `ctrWithValue` | Literal value owned by this CTR, same value-type narrowing as a token's `value` (`$valueType`).                    |
| `$ref`  | `ctrWithRef`   | Alias target. **MUST** resolve to a token or CTR `uuid` in the dataset (rule SPEC-055, mirrors SPEC-001/SPEC-027). |

A CTR **MUST NOT** declare both `value` and `$ref` (enforced at Layer 1 via `not: { required: [...] }`, mirroring `token.schema.json`).

## Identity

| Field  | Required | Type          | Description                                                                                                                                                                  |
| ------ | -------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uuid` | no       | string (uuid) | **MUST** be globally unique across all relationship entries within the same cascade layer (rule SPEC-056, mirrors SPEC-004). Required for a CTR to be a valid `$ref` target. |

## Legacy fields (interim)

To keep `packages/tokens/src` (the legacy generated output, produced by `design-data migrate legacy-output` / `sdk/core/src/legacy.rs`) byte-identical while this foundation lands, a CTR that has a legacy counterpart carries transitional fields so the existing legacy generator can still reproduce that output:

| Field       | Required | Type          | Description                                                                                                 |
| ----------- | -------- | ------------- | ----------------------------------------------------------------------------------------------------------- |
| `legacyKey` | no       | string        | Pins the exact flat key written to legacy output, mirroring the token name-object `legacyKey` escape hatch. |
| `setUuid`   | no       | string (uuid) | Identifies the legacy color-set entry this CTR belongs to. Only meaningful alongside `legacyKey`.           |
| `setSchema` | no       | string        | Names the legacy color-set schema this CTR's set entry conforms to. Only meaningful alongside `setUuid`.    |

**NORMATIVE:** A CTR that has no legacy counterpart **SHOULD NOT** carry `legacyKey`/`setUuid`/`setSchema` — these fields exist solely to bridge the interim period before the legacy generator is retired or rewritten to consume CTRs directly. Rule SPEC-057 (`ctr-legacykey-present-if-legacy`, warning) is an advisory placeholder documenting this intent; it does not attempt to detect "should have a legacy counterpart" automatically, since that determination belongs to the (future) generator-side migration work, not this foundation.

These fields are transitional. Once the legacy generator (or its replacement) reads CTRs directly, `legacyKey`/`setUuid`/`setSchema` are expected to be removed in a later spec version.

## Relationship to `tokenBindings` / `componentBindings`

CTRs are designed to eventually supersede both `tokenBindings` (on components, see [component-format.md#token-bindings](component-format.md#token-bindings)) and the token-side `componentBindings` reverse index (see [token-format.md#component-bindings](token-format.md#component-bindings)), by combining both directions — and the token name-object scope fields — into a single first-class relationship record with an explicit `context`.

**NORMATIVE:** This chapter does **NOT** remove or deprecate `tokenBindings` or `componentBindings`. Both remain valid and required as-is. Migrating existing data onto CTRs, and any eventual removal of the superseded mechanisms, is out of scope for this foundation and deferred to a separate migration phase.

## SPEC rules

The following rules are added to the Layer 2 rule catalog (`rules/rules.yaml`) by this chapter. New CTR rules start at SPEC-051 to avoid collision with the existing catalog (SPEC-001–SPEC-050).

| Rule ID  | Name                              | Severity | Assert                                                                                                                                                                                                                                             |
| -------- | --------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SPEC-051 | `ctr-component-exists`            | error    | CTR `scope.component` value **MUST** match the `name` of a declared component in the dataset.                                                                                                                                                      |
| SPEC-052 | `ctr-part-valid`                  | error    | CTR `scope.part` value **MUST** match the `name` of a declared anatomy part on the referenced component (when present).                                                                                                                            |
| SPEC-053 | `ctr-option-valid`                | error    | CTR `scope.options.<key>` value **MUST** match a value in the declared `options.<key>.values` list for the referenced component (when that list exists).                                                                                           |
| SPEC-054 | `ctr-state-valid`                 | error    | CTR `scope.options.state` array elements **MUST** match the `name` of a declared state on the referenced component (when state declarations are present).                                                                                          |
| SPEC-055 | `ctr-ref-resolves`                | error    | CTR `$ref` value **MUST** resolve to a declared token or relationship `uuid` in the dataset.                                                                                                                                                       |
| SPEC-056 | `ctr-uuid-unique`                 | error    | CTR `uuid` values **MUST** be unique across all relationship entries within the same cascade layer.                                                                                                                                                |
| SPEC-057 | `ctr-legacykey-present-if-legacy` | warning  | Advisory placeholder: a CTR that round-trips through the legacy generator **SHOULD** carry `legacyKey`. Generator-side "should have a legacy counterpart" detection is deferred; this rule documents intent rather than enforcing it structurally. |
