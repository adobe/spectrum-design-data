# Anatomy format

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the normative **anatomy part declaration** object: the named visual sub-parts of a component that appear as values of the `anatomy` field in token name objects. Anatomy declarations complete the machine-readable contract introduced by the component declaration (see [Component format — Anatomy stub](component-format.md#anatomy-stub)) and enable cross-reference validation between tokens and component surfaces.

Scoped under [RFC-A — Component Contract in Design Data Spec](https://github.com/adobe/spectrum-design-data/discussions/832). See also [Component format](component-format.md).

## Anatomy part object

An anatomy part is a **JSON object** that appears as an element of a component declaration's `anatomy` array. Each anatomy part object **MUST** validate against the standalone schema [`anatomy-part.schema.json`](../schemas/anatomy-part.schema.json) (canonical `$id`: `https://opensource.adobe.com/spectrum-design-data/schemas/v0/anatomy-part.schema.json`).

**NORMATIVE:** `anatomy` **MUST** be a JSON array within the component declaration. Each element **MUST** be an anatomy part object.

### Fields

| Field         | Type             | Required | Description                                                                                                              |
| ------------- | ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `name`        | string           | REQUIRED | Kebab-case identifier. **MUST** match the pattern `^[a-z][a-z0-9-]*$`.                                                   |
| `description` | string           | OPTIONAL | Plain-text description of the part's visual role and boundaries.                                                         |
| `required`    | boolean          | OPTIONAL | Whether this part is always rendered regardless of configuration. Default: `false`.                                      |
| `contains`    | array of strings | OPTIONAL | Informative list of child anatomy part names nested within this part (e.g. a `field` contains `["label", "help-text"]`). |

**NORMATIVE:** No properties beyond those listed above are permitted in an anatomy part object. Additional fields **MUST** cause a Layer 1 schema error.

### `name`

**NORMATIVE:** `name` **MUST** match the pattern `^[a-z][a-z0-9-]*$` — lower-case kebab-case, non-empty.

**NORMATIVE:** `name` **MUST** be unique within the `anatomy` array of a single component declaration (rule SPEC-024). Duplicate `name` values on the same component are a validation error.

**NORMATIVE:** Token name-object `anatomy` field values referencing a component **MUST** match the `name` of a declared anatomy part on that component (rule SPEC-020). An undeclared `anatomy` value is a validation error.

### `description`

**OPTIONAL.** A plain-text description of the anatomy part's visual role (e.g. `"Background fill track behind the progress indicator."`).

**RECOMMENDED:** Custom anatomy part names (those outside the [canonical anatomy vocabulary](#canonical-anatomy-vocabulary)) **SHOULD** include a `description` to document intent (rule SPEC-023 fires a warning for undocumented custom names).

### `required`

**OPTIONAL.** A boolean indicating whether the anatomy part is always present in the component's rendered output, regardless of its configuration options. Defaults to `false`.

When `required` is `true`, the anatomy part is unconditionally rendered (e.g. a `label` that cannot be hidden). When `false` or omitted, the part may or may not appear depending on component props.

### `contains`

**OPTIONAL.** An informative list of child anatomy part `name` values that are visually or structurally nested within this part. This field is for documentation and tooling assistance; it does not carry enforcement semantics.

**RECOMMENDED:** When a part logically encloses other declared anatomy parts, authors **SHOULD** use `contains` to make the nesting explicit.

Each string in `contains` **MUST** match the pattern `^[a-z][a-z0-9-]*$`. References to anatomy part names not declared on the same component are permitted (they may refer to sub-component anatomy in layered designs) but validators **MAY** surface a warning for unresolved references.

```json
"anatomy": [
  {
    "name": "field",
    "description": "Input field wrapper enclosing the label and help text.",
    "contains": ["label", "help-text"]
  },
  { "name": "label",     "description": "Primary text label.", "required": true },
  { "name": "help-text", "description": "Guidance text below the field." }
]
```

## Canonical anatomy vocabulary

The following anatomy part names are defined by the cross-platform design audit and **SHOULD** be used in preference to custom names when their semantics match. Using canonical names enables cross-component tooling, documentation generation, and token audits.

| Name                  | Semantics                                                                |
| --------------------- | ------------------------------------------------------------------------ |
| `body`                | Primary content area of a component (e.g. card body, dialog body).       |
| `checkmark`           | Selection indicator used in checkbox or radio components.                |
| `disclosure-triangle` | Expand/collapse indicator for accordion, tree, or disclosure components. |
| `field`               | Input field wrapper (encloses label, input surface, and help text).      |
| `handle`              | Drag handle for resizable or sortable components.                        |
| `header`              | Top section of a panel, card, or dialog.                                 |
| `icon`                | Decorative or semantic icon placed within a component.                   |
| `label`               | Primary text label identifying the component or its value.               |
| `picker`              | Dropdown trigger area (the visible affordance, not the overlay).         |
| `progress-bar`        | Visual progress fill track indicating completion level.                  |
| `swatch`              | Color or pattern preview area.                                           |
| `thumbnail`           | Image preview area within a component.                                   |
| `track`               | Background rail for slider or progress bar components.                   |
| `value`               | Numeric or text display value shown within a component.                  |

Custom part names are permitted. When a custom name is used, the anatomy part object **SHOULD** include a `description` field explaining its visual role (rule SPEC-023).

The table above is informative; the authoritative vocabulary is `@adobe/design-system-registry/registry/anatomy-terms.json` (119 entries). SPEC-035 fires advisory warnings when a declared anatomy part `name` is not in that registry, pointing authors at the canonical list. Custom names remain valid — SPEC-035 is advisory, not an error.

## Cross-reference with token name objects

Token name objects use an `anatomy` field to scope a token to a specific visible part of a component. The `anatomy` field value must correspond to a part declared in the component's `anatomy` array.

**NORMATIVE:** A token name-object `anatomy` field value **MUST** match the `name` of a declared anatomy part on the component identified by the token's `component` field (rule SPEC-020). An `anatomy` value that does not match any declared part name is a validation error.

See [Token format — Name object](token-format.md#name-object) for the full name object field catalog.

**NORMATIVE:** The `anatomy` field in a token name object **MUST NOT** be present unless the token's `component` field is also present (rule SPEC-025). Anatomy is always scoped to a component.

```json
{
  "name": {
    "component": "slider",
    "anatomy": "handle",
    "property": "background-color",
    "state": "hover"
  },
  "value": "#0265dc"
}
```

## SPEC rules

The following rules in the Layer 2 rule catalog (`rules/rules.yaml`) apply to anatomy part declarations. SPEC-020 was introduced in Phase 6.1 (component-format); SPEC-023, SPEC-024, and SPEC-025 are introduced by this chapter.

| Rule ID  | Name                              | Severity | Assert                                                                                                                                                    |
| -------- | --------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SPEC-020 | `component-anatomy-valid`         | error    | Token `anatomy` field value **MUST** match the `name` of a declared anatomy part on the referenced component.                                             |
| SPEC-023 | `anatomy-custom-part-documented`  | warning  | Anatomy part declarations with a `name` outside the canonical anatomy vocabulary **SHOULD** include a `description` field documenting the part's purpose. |
| SPEC-024 | `anatomy-part-name-unique`        | error    | Anatomy part `name` values **MUST** be unique within a single component's `anatomy` array.                                                                |
| SPEC-025 | `anatomy-requires-component`      | error    | A token name object **MUST NOT** include an `anatomy` field unless a `component` field is also present.                                                   |
| SPEC-035 | `anatomy-part-name-registry-sync` | warning  | A component anatomy part's `name` **SHOULD** appear in the canonical anatomy-terms registry (`anatomy-terms.json`).                                       |

## Full example

A complete `anatomy` array for a slider component, demonstrating canonical names, a custom name, and `contains` usage:

```json
"anatomy": [
  {
    "name": "track",
    "description": "Background rail spanning the slider's full range.",
    "required": true
  },
  {
    "name": "progress-bar",
    "description": "Filled portion of the track indicating the current value.",
    "required": true
  },
  {
    "name": "handle",
    "description": "Draggable thumb positioned at the current value.",
    "required": true
  },
  {
    "name": "label",
    "description": "Text label identifying the slider.",
    "required": false
  },
  {
    "name": "value",
    "description": "Numeric display of the current slider value.",
    "required": false
  },
  {
    "name": "tick-marks",
    "description": "Discrete step indicators along the track. Present only when step markers are enabled.",
    "required": false
  },
  {
    "name": "range-group",
    "description": "Wrapper grouping the track and both handles for a range slider variant.",
    "required": false,
    "contains": ["track", "progress-bar", "handle"]
  }
]
```

In this example, `tick-marks` and `range-group` are custom names outside the canonical vocabulary. Both include a `description` to satisfy rule SPEC-023. The `range-group` part uses `contains` to declare that it encloses `track`, `progress-bar`, and `handle`.
