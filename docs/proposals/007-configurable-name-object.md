# Proposal 007: Configurable Name-Object Field Catalog

**Status:** Draft\
**Affects:** `packages/design-data-spec` — schemas, spec prose\
**Spec reference:** taxonomy.md, token-format.md, manifest.md

## Problem

The current spec hardcodes 13 semantic fields + 3 dimension fields on the name object. Every time a design system needs a new concept category (`script`, `style`, `scaleIndex`), the spec itself must change. Proposals 001–006 each introduce new fields that require spec edits.

More fundamentally: other design systems (Material Design, Lightning Design, Carbon) would have entirely different concept categories — different vocabulary, different serialization order, different registries. There is no mechanism for them to declare their own fields without forking the spec.

## Proposal

Make the name object **schema-configurable** through a **field catalog**: design systems declare their own concept categories, vocabulary sources, and validation rules. The spec defines the *mechanism*; design systems define their *fields*.

### Analogy

The dimension system already solves this for cascade axes:

1. A `dimension.schema.json` declaration defines the axis name, allowed modes, and default
2. Tokens use the declared dimension name as a name-object key
3. Validation checks values against declared modes (strict)

The field catalog applies the same pattern to semantic fields.

### `field.schema.json`

A new schema (`packages/design-data-spec/schemas/field.schema.json`) for declaring a single name-object field:

```json
{
  "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/v0/field.schema.json",
  "specVersion": "1.0.0-draft",
  "name": "style",
  "description": "Visual treatment or presentation style",
  "kind": "semantic",
  "registry": "packages/design-system-registry/registry/styles.json",
  "validation": "advisory",
  "serialization": {
    "position": 13
  },
  "scope": null,
  "required": false,
  "valueType": "string"
}
```

| Field                    | Type                                   | Description                                            |
| ------------------------ | -------------------------------------- | ------------------------------------------------------ |
| `name`                   | string                                 | Field key on the name object                           |
| `description`            | string                                 | Human-readable purpose                                 |
| `kind`                   | `"semantic"` \| `"dimension"`          | Whether field participates in cascade resolution       |
| `registry`               | string \| null                         | Path to registry file for vocabulary. Null = free-form |
| `validation`             | `"strict"` \| `"advisory"` \| `"none"` | Severity when value not found in registry              |
| `serialization.position` | integer                                | Default order in the serialized token name (0-based)   |
| `scope`                  | string \| null                         | Token-type restriction. Null = universal               |
| `required`               | boolean                                | Whether field must be present on every name object     |
| `valueType`              | `"string"` \| `"integer"`              | Type of the field value                                |

### Default field catalog: `packages/design-data-spec/fields/`

Spectrum's existing 13 semantic + 3 dimension fields are now declared as a default catalog in `packages/design-data-spec/fields/`:

```
fields/
  property.json       (position 6,  required, semantic, advisory)
  variant.json        (position 0,  semantic, advisory)
  component.json      (position 1,  semantic, advisory)
  structure.json      (position 2,  semantic, advisory)
  substructure.json   (position 3,  semantic, advisory)
  anatomy.json        (position 4,  semantic, advisory)
  object.json         (position 5,  semantic, advisory)
  orientation.json    (position 7,  semantic, advisory)
  position.json       (position 8,  semantic, advisory)
  size.json           (position 9,  semantic, advisory)
  density.json        (position 10, semantic, advisory)
  shape.json          (position 11, semantic, advisory)
  state.json          (position 12, semantic, advisory)
  color-scheme.json   (position 13, dimension, strict)
  scale.json          (position 14, dimension, strict)
  contrast.json       (position 15, dimension, strict)
```

New fields from Proposals 001–006 can be added as new files in this directory without touching any existing spec:

```
fields/
  script.json         (Proposal 001 — typography)
  emphasis.json       (Proposals 001 + 002 — shared)
  style.json          (Proposal 002 — component style axis)
  static-color.json   (Proposal 002 — theme-override color)
  scale-index.json    (Proposal 003 — numeric scale)
```

### `manifest.schema.json` change

The `conceptOrder` enum in `manifest.schema.json` is updated from a hardcoded list of 13 field names to a free-form array of strings:

```json
"conceptOrder": {
  "type": "array",
  "items": { "type": "string", "minLength": 1 },
  "uniqueItems": true,
  "description": "Ordered list of field names for serialization. Values must match declared field names from the design system's field catalog."
}
```

This is backward-compatible: existing manifests with valid `conceptOrder` arrays continue to validate. The semantic constraint (values must be declared field names) becomes a Layer 2 validation rule rather than a JSON Schema enum.

## How it works

**At design system level** (foundation repo):

1. Declare fields in `fields/` directory using `field.schema.json`
2. Each file maps a name-object key to: kind, registry, validation severity, default position
3. `token.schema.json` nameObject remains structurally open (`additionalProperties: { type: "string" }`)
4. Vocabulary validation is driven by field declarations, not by hardcoded `ENUM_CHECKED_FIELDS`

**At platform level** (manifest):

1. Platform references the foundation's field declarations
2. `conceptOrder` lists declared field names to customize serialization order
3. Platform can add platform-specific fields (e.g., iOS adds `framework` dimension)
4. Abbreviations map full term to abbreviated form per existing mechanism

**At validation time:**

1. Load field declarations into an indexed map (field name → declaration)
2. For each token name object key:
   * If field has `registry`: validate value against registry with declared severity
   * `semantic` + `advisory`: warn if not in registry
   * `semantic` + `strict`: error if not in registry
   * `dimension` + `strict`: error if not in declared modes (existing behavior)
3. Unknown keys (not in catalog) → advisory warning

## Migration path

**Phase 1 (this PR): Field catalog files** — Create `field.schema.json` and default catalog for Spectrum's 13+3 fields. Update `manifest.schema.json` to remove hardcoded enum. All existing tools work unchanged — additive only.

**Phase 2: Tool adoption** — Update `token-mapping-analyzer` and validation tools to load field declarations at startup and use the catalog for registry lookup instead of hardcoded field lists.

**Phase 3: SDK update** — Replace `ENUM_CHECKED_FIELDS` match statement in `sdk/core/src/validate/spec009.rs` and `for_field()` in `sdk/core/src/registry.rs` with table-driven catalog lookups.

**Phase 4: Spec rewrite** — Reframe `taxonomy.md` as defining the field-declaration mechanism. Spectrum's specific fields move to a "Spectrum default field catalog" section.

## Impact

* No breaking change — additive only in Phase 1
* Existing 13+3 fields representable as field declarations
* Proposals 001–006 can each add a new `fields/*.json` file without touching core spec
* Any design system can define a completely different field set
* `manifest.schema.json` `conceptOrder` validates structurally, field-name checking moves to Layer 2
