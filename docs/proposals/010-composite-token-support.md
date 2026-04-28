# Proposal 010: Composite Token Support

**Status:** Draft\
**Affects:** token-format.md, token.schema.json, value-types schemas, rules.yaml\
**Spec reference:** token-format.md — value types; cascade.md — resolution model

## Problem

The spec has no formal concept of composite tokens. Three composite patterns already exist in the legacy token schemas but are entirely ad-hoc:

| Type                 | Value shape                          | Schema                              | Example                |
| -------------------- | ------------------------------------ | ----------------------------------- | ---------------------- |
| **typography**       | Object with 5 alias properties       | `token-types/typography.json`       | `component-m-regular`  |
| **drop-shadow**      | Array of layer objects               | `token-types/drop-shadow.json`      | `drop-shadow-elevated` |
| **typography-scale** | Object with `{fontSize, lineHeight}` | `token-types/typography-scale.json` | `typography-scale-100` |

Each composite defines its own schema under `packages/tokens/schemas/token-types/` with no spec-level rules, no value-type declaration mechanism, and no formal handling of alias references inside composite values.

In legacy format, each token has `$schema` pointing to its type schema. In cascade format, there is no equivalent — the spec's `token.schema.json` accepts any `object` or `array` as a value with no type discrimination. This means:

1. Tooling cannot discover what type a token's value is
2. Validators cannot check if a composite's inline aliases resolve to compatible types
3. Consumers cannot distinguish a typography composite from a drop-shadow composite

## Prior Art

**W3C DTCG** defined 7 composite types (Shadow, Stroke Style, Border, Transition, Gradient, Typography) with sub-value alias support. The latest editors draft appears to have pulled composite types, suggesting the community found the hardcoded approach problematic.

**Sass mixins** bundle multiple property declarations with parameterization — a code-level pattern rather than a data format.

## Proposal

### 1. Value-type declaration (`$valueType`)

Add an optional `$valueType` field to the token schema. It is a URI reference pointing to a value-type schema under `schemas/value-types/`.

```json
{
  "name": { "property": "typography-scale", "scale": "desktop" },
  "$valueType": "value-types/typography-scale.schema.json",
  "value": { "fontSize": "14px", "lineHeight": "18px" },
  "uuid": "377145e8-079b-43fd-b522-8f16b1b8f883"
}
```

When `$valueType` is present, the `value` **MUST** validate against the referenced schema (rule SPEC-016). When absent, the existing permissive `anyOf` validation applies.

This is advisory in this phase — tokens without `$valueType` remain valid. Strong recommendation for all composite tokens.

### 2. Composite value types

A **composite value type** is any value-type schema whose root type is `object` or `array`. Composites follow the same conventions as primitive value types:

* Defined as JSON Schemas under `schemas/value-types/`
* Use `$id` under the `v0/value-types/` base path
* Referenced by `$valueType` on tokens

Three initial composite schemas:

**`typography.schema.json`**

```json
{
  "type": "object",
  "properties": {
    "fontFamily": { "type": "string" },
    "fontSize": { "type": "string" },
    "fontWeight": { "type": "string" },
    "letterSpacing": { "type": "string" },
    "lineHeight": { "type": "string" }
  },
  "required": ["fontFamily", "fontSize", "fontWeight", "lineHeight"],
  "additionalProperties": false
}
```

**`drop-shadow.schema.json`**

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "x": { "type": "string" },
      "y": { "type": "string" },
      "blur": { "type": "string" },
      "spread": { "type": "string" },
      "color": { "type": "string" }
    },
    "required": ["x", "y", "blur", "spread", "color"],
    "additionalProperties": false
  },
  "minItems": 1
}
```

**`typography-scale.schema.json`**

```json
{
  "type": "object",
  "properties": {
    "fontSize": { "type": "string" },
    "lineHeight": { "type": "string" }
  },
  "required": ["fontSize", "lineHeight"],
  "additionalProperties": false
}
```

### 3. Inline alias references

Within a composite value, a string sub-value **MAY** be an **inline alias**: a reference to another token resolved to produce the final sub-value.

```json
{
  "name": { "property": "component-m-regular" },
  "$valueType": "value-types/typography.schema.json",
  "value": {
    "fontFamily": "{sans-serif-font-family}",
    "fontSize": "{font-size-100}",
    "fontWeight": "{regular-font-weight}",
    "letterSpacing": "{letter-spacing}",
    "lineHeight": "{line-height-font-size-100}"
  }
}
```

The inline alias syntax is `{token-name}` (curly-brace-wrapped token property name). Inline aliases are subject to the same resolution rules as top-level aliases:

* **SPEC-014**: Target must exist in the dataset
* **SPEC-015**: Resolved value must be type-compatible
* **SPEC-003**: No circular references (extended to cover inline aliases)

### 4. Cascade atomicity

A composite token participates in cascade resolution as an **atomic unit**. Sub-values within a composite do not independently match, override, or participate in specificity calculation.

Partial overrides (e.g., "override just the fontSize of this typography composite") require a separate token with a more-specific name object targeting the individual property. Composite merge semantics are out of scope for this proposal.

## Impact

* **Zero breaking changes** — `$valueType` is optional; existing tokens remain valid
* **Three new value-type schemas** in `schemas/value-types/`
* **Three new validation rules** (SPEC-014, SPEC-015, SPEC-016)
* **Spec text additions** to token-format.md (composite section, `$valueType`, inline alias rules)
* **Conformance fixtures** for valid composites and `$valueType` violations

## Relationship to W3C DTCG

| Aspect              | W3C DTCG                           | This proposal                        |
| ------------------- | ---------------------------------- | ------------------------------------ |
| Type declaration    | `$type` (inherited through groups) | `$valueType` (per-token, optional)   |
| Specific types      | 7 hardcoded composites             | General mechanism + schema instances |
| Sub-value aliases   | Alias syntax in sub-values         | `{token-name}` inline alias          |
| Sub-property access | Supported                          | Deferred                             |
| Cascade atomicity   | N/A (no cascade system)            | Composites are atomic                |

## Open Questions

1. **Sub-property access**: Should the spec support `{typography-scale-100.fontSize}` to extract individual sub-values from a composite? This is useful but adds significant complexity (path resolution, type inference). Deferred for now.

2. **UUID-based inline aliases**: Top-level aliases use `$ref` with UUID resolution in cascade format, but inline aliases use `{token-name}`. Should we add a UUID-based inline alias syntax for cascade parity?

3. **Composite nesting**: Should composites be allowed to reference other composites as sub-values? (e.g., a typography composite referencing a typography-scale composite). The current alias mechanism supports this implicitly.

4. **Value-type registry**: Should there be a machine-readable index of all value-type schemas under `schemas/value-types/` for tooling discovery?
