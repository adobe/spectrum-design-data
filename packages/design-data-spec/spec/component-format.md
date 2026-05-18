# Component format

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the normative **component declaration** object: identity (`$id`, `name`, `displayName`), component metadata (`meta`), API options (`options`), named content slots (`slots`), anatomy parts (`anatomy`), state model (`states`), and lifecycle metadata.

Component declarations close the structural gap between the token name-object's `component`, `variant`, `anatomy`, and `state` fields and the declared surface of each component. Before this chapter, a token referencing `component: "button"` with `variant: "foo"` was undetectable as invalid because no machine-readable component contract existed in the same spec. After this chapter, validators enforce cross-reference rules (see [SPEC rules](#spec-rules)).

Scoped under [RFC-A — Component Contract in Design Data Spec](https://github.com/adobe/spectrum-design-data/discussions/832). See also [rfc-coordination.md](../docs/rfc-coordination.md).

## Document shape

A component declaration is a **single JSON object** in a `.json` file. One file per component. Files live under a `components/` directory within a design-data package.

**NORMATIVE:** Each component declaration file **MUST** validate against the Layer 1 schema [`component.schema.json`](../schemas/component.schema.json) (canonical `$id`: `https://opensource.adobe.com/spectrum-design-data/schemas/v0/component.schema.json`). Layer 1 and Layer 2 validation are defined in the [validation layers](index.md#validation-layers) section of the overview.

## Component object

### Required fields

A component declaration **MUST** contain:

| Field         | Type              | Description                                                                           |
| ------------- | ----------------- | ------------------------------------------------------------------------------------- |
| `$id`         | URI string        | Canonical identifier for this component declaration.                                  |
| `name`        | kebab-case string | Machine identifier; used as the value of the `component` field in token name objects. |
| `displayName` | string            | Human-readable component name (e.g. `"Button"`).                                      |
| `meta`        | object            | Category and documentation link — see [Meta](#meta).                                  |

### Optional fields

| Field            | Type   | Description                                                                                                                                |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `specVersion`    | string | Declares which spec version this document targets. Currently `"1.0.0-draft"`; future stable releases will accept their own version string. |
| `description`    | string | Plain-text description of the component's purpose.                                                                                         |
| `options`        | object | Component API options — see [Options](#options).                                                                                           |
| `slots`          | array  | Named content injection points — see [Slots](#slots).                                                                                      |
| `anatomy`        | array  | Named anatomy parts — see [Anatomy (stub)](#anatomy-stub).                                                                                 |
| `states`         | array  | Per-component state declarations — see [States (stub)](#states-stub).                                                                      |
| `lifecycle`      | object | Version lifecycle metadata — see [Lifecycle](#lifecycle).                                                                                  |
| `tokenBindings`  | array  | Tokens this component uses — see [Token bindings](#token-bindings) (Phase 6.7).                                                            |
| `documentBlocks` | array  | Typed prose blocks for this component — see [Document blocks](#document-blocks) (Phase 9).                                                 |
| `accessibility`  | object | Semantic accessibility vocabulary — see [Accessibility](accessibility.md) (Phase 7).                                                       |

**NORMATIVE:** No properties beyond those listed above are permitted at the top level of a component declaration. Additional fields **MUST** cause a Layer 1 schema error.

### `$id`

**NORMATIVE:** The `$id` **MUST** be a valid URI identifying this component declaration document. The recommended pattern is:

```
https://opensource.adobe.com/spectrum-design-data/schemas/v0/components/{name}.json
```

where `{name}` matches the component's `name` field.

### `name`

**NORMATIVE:** `name` **MUST** match the pattern `^[a-z][a-z0-9-]*$` — lower-case kebab-case, non-empty.

**NORMATIVE:** `name` **MUST** be unique within a dataset. No two component declarations in the same design-data package may share a `name` value.

**NORMATIVE:** Token name-object `component` field values **MUST** match the `name` of a declared component in the dataset (rule SPEC-018). An undeclared `component` value is a validation error.

### Meta

**NORMATIVE:** `meta` **MUST** contain:

| Field              | Type          | Values                                                                                                    |
| ------------------ | ------------- | --------------------------------------------------------------------------------------------------------- |
| `category`         | string (enum) | `actions`, `containers`, `data visualization`, `feedback`, `inputs`, `navigation`, `status`, `typography` |
| `documentationUrl` | URI string    | Link to the component's documentation page.                                                               |

```json
"meta": {
  "category": "actions",
  "documentationUrl": "https://spectrum.adobe.com/page/button/"
}
```

## Options

The `options` block declares the component's API surface — the configurable properties that affect its appearance or behavior. It mirrors the shape of `@adobe/spectrum-component-api-schemas` for backward compatibility.

**NORMATIVE:** `options` **MUST** be a JSON object. Each key is an option name; each value is an **option descriptor**.

### Option descriptor

An option descriptor is a JSON object with the following fields:

| Field         | Type            | Required | Description                                                                                                                                                                                                          |
| ------------- | --------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`        | string or array | OPTIONAL | JSON Schema primitive type(s): `"string"`, `"boolean"`, `"number"`, `"integer"`.                                                                                                                                     |
| `values`      | array           | OPTIONAL | Exhaustive list of permitted values, each an [`optionValue`](#optionvalue) object. Use this instead of JSON Schema's `enum` keyword so per-value lifecycle metadata can be expressed without a separate sidecar map. |
| `default`     | any             | OPTIONAL | Default value when the option is not specified.                                                                                                                                                                      |
| `description` | string          | OPTIONAL | Plain-text description of what the option controls.                                                                                                                                                                  |
| `$ref`        | URI string      | OPTIONAL | Reference to a shared type schema (e.g. `workflow-icon.json`).                                                                                                                                                       |

### optionValue

Each entry in `values` is an object:

| Field         | Type   | Required | Description                                                                              |
| ------------- | ------ | -------- | ---------------------------------------------------------------------------------------- |
| `value`       | any    | REQUIRED | The permitted option value.                                                              |
| `description` | string | OPTIONAL | Plain-text description of what this value means.                                         |
| `lifecycle`   | object | OPTIONAL | Version lifecycle metadata. Set `lifecycle.deprecated` to signal migration via SPEC-037. |

**NORMATIVE:** Each key in `options` **MUST** be camelCase.

**NORMATIVE:** Boolean option names **MUST** begin with `is` or `has` (e.g. `isDisabled`, `hasIcon`).

**NORMATIVE:** When `values` is present, token name-object `variant` field values referencing this component **MUST** be drawn from the declared `variant` option `values` list (rule SPEC-019, Error). Token name-object keys matching any other declared option's `values` list **SHOULD** be drawn from that list (rule SPEC-040, Warning). Both rules are silent when no `values` array is declared for the option.

**ADVISORY:** When a value in `values` carries a `lifecycle.deprecated` string and a non-deprecated token references that value via its `name` object field, SPEC-037 fires an advisory warning prompting migration or token deprecation.

Example with a deprecated option value:

```json
"variant": {
  "type": "string",
  "values": [
    { "value": "primary" },
    { "value": "secondary" },
    {
      "value": "cta",
      "lifecycle": {
        "deprecated": "1.0.0-draft",
        "deprecatedComment": "Use primary instead."
      }
    }
  ]
}
```

```json
"options": {
  "variant": {
    "type": "string",
    "values": [
      { "value": "accent" },
      { "value": "negative" },
      { "value": "primary" },
      { "value": "secondary" }
    ],
    "default": "accent",
    "description": "Visual emphasis level."
  },
  "size": {
    "type": "string",
    "values": [
      { "value": "s" },
      { "value": "m" },
      { "value": "l" },
      { "value": "xl" }
    ],
    "default": "m"
  },
  "isDisabled": {
    "type": "boolean",
    "default": false
  },
  "icon": {
    "$ref": "https://opensource.adobe.com/spectrum-design-data/schemas/types/workflow-icon.json",
    "description": "Icon placed at the start of the button. Required when hideLabel is true."
  }
}
```

## Slots

The `slots` block declares the component's named **content injection points** — the positions where consumers place child content. Slot declarations are derived from the cross-platform audit in [`audits/slots.audit.md`](../audits/slots.audit.md).

**NORMATIVE:** `slots` **MUST** be a JSON array. Each element is a **slot declaration**.

### Slot declaration

| Field         | Type    | Required | Description                                                                 |
| ------------- | ------- | -------- | --------------------------------------------------------------------------- |
| `name`        | string  | REQUIRED | Slot identifier. **SHOULD** come from the canonical vocabulary (see below). |
| `description` | string  | OPTIONAL | Plain-text description of what content goes in this slot.                   |
| `required`    | boolean | OPTIONAL | Whether consumers **MUST** populate this slot. Default: `false`.            |

### Canonical slot vocabulary

The following slot names are defined by the cross-platform audit and **SHOULD** be used in preference to custom names:

| Name                 | Semantics                                                               |
| -------------------- | ----------------------------------------------------------------------- |
| `default`            | Primary content (text, children). The main content slot.                |
| `icon`               | Decorative icon at the leading edge of the component.                   |
| `label`              | Human-readable identifier / placeholder text (distinct from `default`). |
| `help-text`          | Non-error guidance text below a form field.                             |
| `negative-help-text` | Validation error message for a form field.                              |
| `action`             | Secondary interactive button or call-to-action.                         |
| `heading`            | Section or dialog heading.                                              |
| `description`        | Section or dialog body text (distinct from `help-text`).                |
| `hero`               | Large header media (e.g. dialog hero image).                            |
| `footer`             | Below-content supplemental area (e.g. dialog footer).                   |
| `tooltip`            | Floating annotation attached to the component.                          |

**NORMATIVE:** Custom slot names are permitted but **SHOULD** be documented in the slot's `description` field (rule SPEC-021 fires a warning for undocumented custom names).

**RECOMMENDED:** Components **SHOULD** declare a `default` slot when they accept primary child content.

```json
"slots": [
  {
    "name": "default",
    "description": "Text label of the button.",
    "required": false
  },
  {
    "name": "icon",
    "description": "Icon placed at the start of the button. Required when isLabelHidden is true."
  }
]
```

## Anatomy (stub)

The `anatomy` block declares the component's named **visual parts** — the anatomy terms used in token name-object `anatomy` fields. Full normative definition is in [`spec/anatomy-format.md`](anatomy-format.md) (Phase 6.2).

**NORMATIVE:** `anatomy` **MUST** be a JSON array. Each element is an anatomy part object.

**NORMATIVE:** Token name-object `anatomy` field values referencing this component **MUST** match the `name` of a declared anatomy part (rule SPEC-020).

Each anatomy part carries at minimum:

| Field         | Type             | Required | Description                                                                                                         |
| ------------- | ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `name`        | string           | REQUIRED | Anatomy part identifier (e.g. `icon`, `label`, `handle`).                                                           |
| `description` | string           | OPTIONAL | Plain-text description of the part.                                                                                 |
| `required`    | boolean          | OPTIONAL | Whether this part is always present. Default: `false`.                                                              |
| `contains`    | array of strings | OPTIONAL | Informative: other anatomy part names nested within this part.                                                      |
| `lifecycle`   | object           | OPTIONAL | Version lifecycle metadata for this part. When `lifecycle.deprecated` is set, SPEC-037 fires on referencing tokens. |

See [`spec/anatomy-format.md`](anatomy-format.md) for constraints, cross-field validation, and the full anatomy part schema.

```json
"anatomy": [
  { "name": "icon", "description": "Leading icon." },
  { "name": "label", "description": "Button text.", "required": true }
]
```

## States (stub)

The `states` block declares the component's **interactive and semantic states** — the state terms used in token name-object `state` fields. Full normative definition is in [`spec/state-model.md`](state-model.md) (Phase 6.3).

**NORMATIVE:** `states` **MUST** be a JSON array. Each element is a state declaration object.

Each state carries at minimum:

| Field        | Type    | Required | Description                                                                                                                               |
| ------------ | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `name`       | string  | REQUIRED | State identifier (e.g. `hover`, `focus`, `disabled`).                                                                                     |
| `trigger`    | string  | OPTIONAL | `"prop"` for persistent prop-driven states (e.g. `isDisabled`) or `"interaction"` for runtime interaction states (hover, focus, pressed). |
| `precedence` | integer | OPTIONAL | Resolution precedence; higher integer wins when multiple states are active.                                                               |
| `layered`    | boolean | OPTIONAL | `true` for states that compose with others (e.g. focus ring over hover). Default: `false`.                                                |
| `lifecycle`  | object  | OPTIONAL | Version lifecycle metadata for this state. When `lifecycle.deprecated` is set, SPEC-037 fires on referencing tokens.                      |

See [`spec/state-model.md`](state-model.md) for the full state resolution algorithm, trigger semantics, and precedence rules.

```json
"states": [
  { "name": "hover",    "trigger": "interaction", "precedence": 50 },
  { "name": "focus",    "trigger": "interaction", "precedence": 60, "layered": true },
  { "name": "disabled", "trigger": "prop",        "precedence": 100 }
]
```

## Lifecycle

The `lifecycle` block tracks a component declaration's version history. It mirrors the per-token lifecycle pattern from [`spec/token-format.md`](token-format.md#lifecycle-and-metadata).

| Field               | Type            | Description                                                                    |
| ------------------- | --------------- | ------------------------------------------------------------------------------ |
| `introduced`        | string          | Spec version when this component declaration was added (e.g. `"1.0.0-draft"`). |
| `deprecated`        | string          | Spec version when this component was deprecated. Truthy = deprecated.          |
| `deprecatedComment` | string          | Human-readable explanation of the deprecation and migration path.              |
| `replacedBy`        | string or array | `name` value(s) of the replacement component(s).                               |

```json
"lifecycle": {
  "introduced": "1.0.0-draft"
}
```

## Token bindings

The optional `tokenBindings` array declares which tokens a component uses, including foundation and structure tokens that do not carry the component name in their name-object. This is the *component-declares-usage* direction; the *token-declares-scope* direction is expressed via name-object `component`/`anatomy`/`state` fields and validated by SPEC-018–022.

```json
"tokenBindings": [
  { "token": "component-height-100",         "context": "Minimum height" },
  { "token": "corner-radius-full",           "context": "Rounding" },
  { "token": "button-background-color-accent", "context": "Fill background" }
]
```

Each entry contains:

| Field     | Required | Type   | Description                                                                                                                                             |
| --------- | -------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `token`   | yes      | string | Token name. **MUST** resolve to a declared token in the dataset when the dataset is present (rule SPEC-027). May reference structure/foundation tokens. |
| `context` | no       | string | Human-readable label for how this token is used (maps to the Figma Token Group label in the S2 Token Specs Figma file).                                 |

**NORMATIVE:** When the dataset includes token declarations, each `tokenBindings[].token` value **MUST** match the name of a declared token (rule SPEC-027). A missing token reference is a validation error.

The `context` field is informative. It is used by `describe_component` (Phase 8 agent surface) to present token usage in grouped, human-readable form.

## SPEC rules

The following rules are added to the Layer 2 rule catalog (`rules/rules.yaml`) by this chapter. New component cross-reference rules start at SPEC-018 to avoid collision with existing token rules (SPEC-001–SPEC-017).

| Rule ID  | Name                             | Severity | Assert                                                                                                                                                                                                                                                                  |
| -------- | -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SPEC-018 | `component-name-exists`          | error    | Token `component` field value **MUST** match the `name` of a declared component in the dataset.                                                                                                                                                                         |
| SPEC-019 | `component-variant-valid`        | error    | Token `variant` field value **MUST** match a value in the declared `variant` option `values` list for the referenced component (when that list exists).                                                                                                                 |
| SPEC-020 | `component-anatomy-valid`        | error    | Token `anatomy` field value **MUST** match the `name` of a declared anatomy part on the referenced component.                                                                                                                                                           |
| SPEC-021 | `component-slot-vocabulary`      | warning  | Component `slots` entries with a `name` outside the canonical vocabulary **SHOULD** include a `description`. Custom slot names without descriptions are surfaced as warnings.                                                                                           |
| SPEC-022 | `component-state-valid`          | error    | Token `state` field value **MUST** match the `name` of a declared state on the referenced component (when state declarations are present).                                                                                                                              |
| SPEC-027 | `token-binding-token-exists`     | error    | Each `tokenBindings[].token` value **MUST** match the name of a declared token in the dataset (Phase 6.7).                                                                                                                                                              |
| SPEC-036 | `component-deprecation-cascade`  | warning  | A non-deprecated token **SHOULD NOT** reference a deprecated component via `name.component`. Advisory warning prompts updating the component reference or marking the token deprecated.                                                                                 |
| SPEC-037 | `sub-entity-deprecation-cascade` | warning  | A non-deprecated token **SHOULD NOT** reference a deprecated anatomy part, state, or option value via `name.*`. Advisory warning prompts migration. Requires `lifecycle` on anatomy/state or `lifecycle` on the matching `values` entry on the option descriptor.       |
| SPEC-038 | `option-enum-obsolete`           | warning  | An option descriptor **SHOULD NOT** use the JSON Schema `enum` keyword. `additionalProperties: true` silently accepts `enum` at Layer 1; SPEC-038 flags it at Layer 2 so authors replace it with the `values` array.                                                    |
| SPEC-040 | `component-option-field-valid`   | warning  | Token name-object keys that match a declared `options.<key>` with a `values[]` list **SHOULD** use a value drawn from that list. Generalises SPEC-019 to non-`variant` option fields (e.g. `style`, `size`, `staticColor`). Advisory; silent when no `values` declared. |

## Full example

A complete button component declaration:

```json
{
  "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/v0/component.schema.json",
  "$id": "https://opensource.adobe.com/spectrum-design-data/schemas/v0/components/button.json",
  "specVersion": "1.0.0-draft",
  "name": "button",
  "displayName": "Button",
  "description": "Buttons allow users to perform an action or to navigate to another page.",
  "meta": {
    "category": "actions",
    "documentationUrl": "https://spectrum.adobe.com/page/button/"
  },
  "options": {
    "variant": {
      "type": "string",
      "values": [
        { "value": "accent" },
        { "value": "negative" },
        { "value": "primary" },
        { "value": "secondary" }
      ],
      "default": "accent",
      "description": "Visual emphasis level."
    },
    "style": {
      "type": "string",
      "values": [{ "value": "fill" }, { "value": "outline" }],
      "default": "fill"
    },
    "size": {
      "type": "string",
      "values": [
        { "value": "s" },
        { "value": "m" },
        { "value": "l" },
        { "value": "xl" }
      ],
      "default": "m"
    },
    "isDisabled": { "type": "boolean", "default": false },
    "isPending": { "type": "boolean", "default": false },
    "isLabelHidden": { "type": "boolean", "default": false },
    "icon": {
      "$ref": "https://opensource.adobe.com/spectrum-design-data/schemas/types/workflow-icon.json",
      "description": "Icon placed at the start of the button. Required when isLabelHidden is true."
    },
    "staticColor": {
      "type": "string",
      "values": [{ "value": "white" }, { "value": "black" }],
      "description": "Static color for use on colored backgrounds. Must not be set for the default variant."
    }
  },
  "slots": [
    {
      "name": "default",
      "description": "Text label of the button.",
      "required": false
    },
    {
      "name": "icon",
      "description": "Icon placed at the start of the button."
    }
  ],
  "anatomy": [
    { "name": "icon",  "description": "Leading icon." },
    { "name": "label", "description": "Button text.", "required": true }
  ],
  "states": [
    { "name": "hover",    "trigger": "interaction", "precedence": 50 },
    { "name": "focus",    "trigger": "interaction", "precedence": 60, "layered": true },
    { "name": "disabled", "trigger": "prop",        "precedence": 100 }
  ],
  "lifecycle": {
    "introduced": "1.0.0-draft"
  }
}
```

## Accessibility

**Phase 7.** Component declarations MAY carry an `accessibility` object at the top level. State declarations MAY carry `announce`, `communicates`, and `blocksInteraction` fields. See [spec/accessibility.md](accessibility.md) for the full vocabulary, SPEC rules, and examples.

```json
{
  "name": "button",
  "displayName": "Button",
  "meta": { "category": "actions", "documentationUrl": "https://spectrum.adobe.com/page/button/" },
  "accessibility": {
    "role": "button",
    "intents": ["trigger"],
    "focusable": true,
    "keyboardIntents": ["activate"],
    "wcag": [
      { "criterion": "4.1.2", "level": "A", "title": "Name, Role, Value" }
    ]
  },
  "states": [
    {
      "name": "disabled",
      "trigger": "prop",
      "precedence": 100,
      "announce": "Button disabled",
      "communicates": "disabled",
      "blocksInteraction": true
    }
  ]
}
```

## Document blocks

**Phase 9.** Component declarations MAY carry a `documentBlocks` array at the top level, and individual anatomy parts MAY carry their own `documentBlocks` arrays. See [spec/document-blocks.md](document-blocks.md) for the full block schema, type vocabulary, and SPEC rules.

```json
{
  "name": "button",
  "displayName": "Button",
  "meta": { "category": "actions", "documentationUrl": "https://spectrum.adobe.com/page/button/" },
  "documentBlocks": [
    {
      "type": "purpose",
      "content": "Buttons trigger a discrete action or event.",
      "agents": "Use Button when the user must trigger an action. For navigation, use Link."
    }
  ],
  "anatomy": [
    {
      "name": "label",
      "required": true,
      "documentBlocks": [
        {
          "type": "guideline",
          "content": "Button labels should be action verbs (Save, Delete, Submit)."
        }
      ]
    }
  ]
}
```
