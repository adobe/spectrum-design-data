# State model

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the normative **state declaration** object: the named conditions that affect a component's visual appearance or token resolution, declared in the `states` array of a component declaration. State declarations complete the machine-readable contract introduced by the component declaration (see [Component format — States stub](component-format.md#states-stub)) and enable cross-reference validation between tokens and component surfaces.

Scoped under [RFC-A — Component Contract in Design Data Spec](https://github.com/adobe/spectrum-design-data/discussions/832). See also [Component format](component-format.md).

## Introduction

A **component state** is a named condition under which a component's visual presentation differs from its baseline. States drive token resolution: when a component is in a given state, the design system selects tokens scoped to that state name rather than (or layered on top of) the baseline tokens.

State names appear in the `state` field of token name objects, an ordered array of one or more atomic state ids (see [Token format — Name object](token-format.md#name-object) and [Proposal 006](../../../docs/proposals/006-compound-states-as-array.md)). A token with `"state": ["hover"]` applies only when the component is in the `hover` state; `"state": ["selected", "hover"]` applies when both states are simultaneously active. For this cross-reference to be machine-enforceable, state declarations **MUST** be present on the component declaration.

States fall into two trigger types:

* **`prop`** — set by a persistent component API property (e.g. `isDisabled`, `isSelected`). The state remains active until the property value changes.
* **`interaction`** — set by runtime user interaction (hover, focus, pressed). The state is transient and is cleared when the interaction ends.

Full normative rules for the `states` array within a component declaration are in this document. The component declaration format is defined in [`spec/component-format.md`](component-format.md).

## State declaration object

A state declaration is a **JSON object** that appears as an element of a component declaration's `states` array. Each state declaration object **MUST** validate against the standalone schema [`state-declaration.schema.json`](../schemas/state-declaration.schema.json) (canonical `$id`: `https://opensource.adobe.com/spectrum-design-data/schemas/v0/state-declaration.schema.json`).

**NORMATIVE:** `states` **MUST** be a JSON array within the component declaration. Each element **MUST** be a state declaration object.

### Fields

| Field         | Type    | Required | Description                                                                                                                                |
| ------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`        | string  | REQUIRED | Kebab-case state identifier. **MUST** match the pattern `^[a-z][a-z0-9-]*$`. Used as the value of the `state` field in token name objects. |
| `description` | string  | OPTIONAL | Plain-text description of the state's semantics and the conditions under which it is active.                                               |
| `trigger`     | string  | OPTIONAL | `"prop"` for persistent prop-driven states; `"interaction"` for runtime interaction states. See [Trigger semantics](#trigger-semantics).   |
| `precedence`  | integer | OPTIONAL | Resolution precedence among active `interaction` states; higher value wins. Defaults to the canonical value for the name, else `0`.        |
| `layered`     | boolean | OPTIONAL | **Deprecated.** Accepted for compatibility and ignored by resolvers. Resolution is per property, so no state needs to be layered.          |
| `lifecycle`   | object  | OPTIONAL | Version lifecycle metadata for this state — see [lifecycle](#lifecycle).                                                                   |

**NORMATIVE:** No properties beyond those listed above are permitted in a state declaration object. Additional fields **MUST** cause a Layer 1 schema error.

### `name`

**NORMATIVE:** `name` **MUST** match the pattern `^[a-z][a-z0-9-]*$` — lower-case kebab-case, non-empty.

**NORMATIVE:** `name` **MUST** be unique within the `states` array of a single component declaration. No two state declaration objects in the same component may share a `name` value.

**NORMATIVE:** Token name-object `state` field values referencing a component **MUST** match the `name` of a declared state on that component, when state declarations are present (rule SPEC-022). An undeclared `state` value is a validation error.

### `description`

**OPTIONAL.** A plain-text description of the state's semantics and the conditions that activate it (e.g. `"Applied while the pointer is positioned over the component."`).

**RECOMMENDED:** Custom state names (those outside the [canonical state vocabulary](#canonical-state-vocabulary)) **SHOULD** include a `description` to document intent (rule SPEC-026 fires a warning for undocumented custom names).

### `trigger`

**OPTIONAL.** One of two string values:

* `"prop"` — the state is driven by a persistent component API property. The state is active as long as the property holds a truthy or specific value (e.g. `isDisabled: true`).
* `"interaction"` — the state is driven by transient user interaction. The state activates when the interaction begins and clears when it ends.

When `trigger` is omitted, the trigger type is unspecified. Validators **MAY** warn for state declarations without a `trigger` when the component has states listed in the canonical vocabulary with a known trigger type.

### `precedence`

**OPTIONAL.** A non-negative integer indicating this state's weight when several `interaction` states are active at once. For a given property, the active interaction state with the highest `precedence` that defines a token for that property wins (see [Precedence and resolution algorithm](#precedence-and-resolution-algorithm)).

When `precedence` is omitted, the [canonical default](#canonical-state-vocabulary) for the state's name applies (after alias normalization), and `0` for a custom name.

**RECOMMENDED:** A component **SHOULD** declare `precedence` only to deviate from the canonical default, or for custom interaction states that can be active together with another interaction state. Two active interaction states with the same effective `precedence` are a tie (see the algorithm).

### `layered`

**DEPRECATED.** Earlier drafts let a state compose on top of a winning non-layered state. Resolution is now per property: a state whose tokens define a property already overrides lower-precedence states for that property, and leaves other properties alone. A focus ring needs no special treatment, because it is an anatomy part whose visibility is bound to the `focus` state.

Schemas still accept `layered` so existing data validates. Resolvers **MUST** ignore it, and validators **SHOULD** warn when it is present.

### `lifecycle`

**OPTIONAL.** A version lifecycle object tracking the history of this state declaration. Uses the same shape as the component-level `lifecycle` block (see [Component format — Lifecycle](component-format.md#lifecycle)).

| Field               | Type   | Description                                                                                      |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `deprecated`        | string | Spec version when this state was deprecated. A truthy string signals deprecation.                |
| `deprecatedComment` | string | Human-readable explanation of the deprecation and migration path (e.g. `"Use active instead."`). |
| `replacedBy`        | string | `name` of the replacement state.                                                                 |

**ADVISORY:** When a state carries a `lifecycle.deprecated` value, non-deprecated tokens that reference this state via `name.state` **SHOULD** be updated to remove or replace the reference. Rule SPEC-037 fires an advisory warning for such references to prompt migration.

## Trigger semantics

### `prop` trigger

A `prop` state is driven by a component API property. The state is persistent: it is active for the full duration that the property holds its activating value and is cleared only when the property changes.

Examples:

* `isDisabled: true` activates the `disabled` state.
* `isSelected: true` activates the `selected` state.
* `isIndeterminate: true` activates the `indeterminate` state.
* `isReadOnly: true` activates the `read-only` state.

A `prop` state selects which token set applies (for example the `selected` tokens). `prop` states are typically mutually exclusive in practice (a component is either disabled or selected, rarely both), but the spec permits several to be active; the one that matches a token's `state` array most completely applies (see the algorithm).

### `interaction` trigger

An `interaction` state is driven by transient user input. The state is active only while the interaction is occurring and is automatically cleared when the interaction ends.

Examples:

* `hover` — active while a pointer device is positioned over the component's interactive area.
* `keyboard-focus` (also `focus` and `focus-visible`) — active while the component holds focus received through keyboard navigation.
* `down` (also `active` and `pressed`) — active while a pointer button or key is held down.

`interaction` states act within the token set that the `prop` states select: a `selected` component that is pressed uses the tokens for `selected` plus `down` when they exist. A component that is `disabled` ignores its interaction states.

## Precedence and resolution algorithm

The following algorithm is **NORMATIVE** for conforming validators and renderers that implement state-aware token resolution.

**Inputs:** A set of currently active state names for a given component instance, and the property being resolved.

**Algorithm:** Run once per property.

1. Normalize the active state names to canonical ids using the aliases in the [canonical state vocabulary](#canonical-state-vocabulary) (for example `pressed` and `active` are `down`, and `focus` is `keyboard-focus`).

2. If `disabled` is active, drop every active `interaction` state.

3. Collect the candidate tokens for the property: those whose `state` array contains only active states. A token with an empty `state` array is the default and is always a candidate.

4. Pick the candidate whose `state` array matches the most active states (specificity). A token scoped to `["selected", "down"]` beats one scoped to `["down"]` or `["selected"]` when both are active.

5. If candidates tie on specificity, compare their matched interaction states by precedence. For each candidate, sort the precedence values of its matched `interaction` states from highest to lowest, then compare the two lists element by element. The first difference decides, and the candidate with the higher value wins. If one list is a prefix of the other, the longer list wins. A candidate with no matched interaction state has an empty list, so it loses to any candidate that has one. For example, `["hover", "keyboard-focus"]` (60, 50) beats `["hover"]` (50) and loses to `["down"]` (70).

6. If candidates still tie (including two candidates that both have no matched interaction state), the one that appears **earlier** in source order wins. This **MUST** be treated as a tie; implementations **SHOULD** emit a warning (see SPEC-006 for the analogous cascade tie rule).

7. If no candidate remains, the property falls back to the `default` state (or baseline tokens when no `default` state is declared).

The result is the resolved appearance for the component instance. States that define no token for a property do not affect it, so a focus state that only binds a ring stroke never changes a fill.

**Example:** A button is `hover`, `keyboard-focus` and `down` at once, with default precedences (50, 60, 70).

* Fill: tokens exist for `hover`, `keyboard-focus` and `down`, so `down` (70) wins. This is pressed > focus > hover.
* Ring stroke: only `keyboard-focus` defines it, so it applies.
* Label color: only `hover` and `down` define it, so `down` wins.

**Example:** A checkbox is `selected`, `hover` and `down`. A token scoped to `["selected", "down"]` matches two active states and beats a token scoped to `["down"]` that matches one. Specificity is compared before precedence.

## Canonical state vocabulary

The following state names are defined by the cross-platform design audit and **SHOULD** be used in preference to custom names when their semantics match. Using canonical names enables cross-component tooling, documentation generation, and token audits.

| Name             | Aliases                               | Trigger     | Precedence | Semantics                                                                                   |
| ---------------- | ------------------------------------- | ----------- | ---------- | ------------------------------------------------------------------------------------------- |
| `default`        |                                       | —           | 0          | No special state; baseline component appearance.                                            |
| `hover`          |                                       | interaction | 50         | Pointer device is positioned over the component's interactive area.                         |
| `keyboard-focus` | `focus`, `focus-visible`, `key-focus` | interaction | 60         | Component holds keyboard focus (focus-visible). A custom name is allowed for pointer focus. |
| `down`           | `active`, `pressed`                   | interaction | 70         | Pointer button or activation key is currently held down.                                    |
| `drag-and-drop`  |                                       | prop        | —          | A drag-and-drop gesture involving this component is in progress.                            |
| `invalid`        |                                       | prop        | —          | Component value has failed validation.                                                      |
| `valid`          |                                       | prop        | —          | Component value has passed validation.                                                      |
| `selected`       |                                       | prop        | —          | Component is selected (checkbox checked, tab active, etc.).                                 |
| `indeterminate`  |                                       | prop        | —          | Component has partial selection (tri-state checkbox mixed state).                           |
| `read-only`      |                                       | prop        | —          | Component value is visible but not editable by the user.                                    |
| `disabled`       |                                       | prop        | —          | Component is non-interactive; interaction states are ignored.                               |

`prop` states have no precedence. They select the token set through specificity (step 4 above). Precedence orders `interaction` states only, and a `precedence` declared on a `prop` state is ignored.

`focus-visible` was a separate state in earlier drafts. It is now an alias of `keyboard-focus`, which already means focus received through keyboard navigation.

**Aliases and the registry:** the alias column is the normative synonym list. `registry/states.json` currently lists `focus` and `keyboard-focus`, and `active` and `down`, as separate entries with equal default precedence (`pressed` is an alias of `active` there). Resolvers **MUST** treat the synonyms in this table as one state (step 1) until the registry is consolidated, so equal numbers never produce a tie between two names for the same state.

Custom state names are permitted. When a custom name is used, the state declaration object **SHOULD** include a `description` field explaining its semantics (rule SPEC-026).

**NORMATIVE:** The values in the canonical vocabulary table (trigger type, precedence) are **RECOMMENDED defaults**. A component declaration MAY override any of these values for a canonical state name by explicitly declaring a different value in the state declaration object. When overriding a canonical default, the `description` **SHOULD** explain the deviation.

## Cross-reference with token name objects

Token name objects use a `state` field to scope a token to a specific component state. The `state` field value must correspond to a state declared in the component's `states` array.

**NORMATIVE:** A token name-object `state` field value **MUST** match the `name` of a declared state on the component identified by the token's `component` field, when state declarations are present on that component (rule SPEC-022). A `state` value that does not match any declared state name is a validation error.

See [Token format — Name object](token-format.md#name-object) for the full name object field catalog.

**NORMATIVE:** The `state` field in a token name object **MUST NOT** be present unless the token's `component` field is also present. States are always scoped to a component.

```json
{
  "name": {
    "component": "checkbox",
    "anatomy": "checkmark",
    "property": "color",
    "state": ["selected"]
  },
  "value": "#0265dc"
}
```

## SPEC rules

The following rules in the Layer 2 rule catalog (`rules/rules.yaml`) apply to state declarations. SPEC-022 was introduced in Phase 6.1 (component-format); SPEC-026 is introduced by this chapter.

| Rule ID  | Name                             | Severity | Assert                                                                                                                                              |
| -------- | -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| SPEC-022 | `component-state-valid`          | error    | Token `state` field value **MUST** match the `name` of a declared state on the referenced component (when state declarations are present).          |
| SPEC-026 | `state-custom-name-documented`   | warning  | State declarations with a `name` outside the canonical state vocabulary **SHOULD** include a `description` field documenting the state's semantics. |
| SPEC-037 | `sub-entity-deprecation-cascade` | warning  | A non-deprecated token **SHOULD NOT** reference a deprecated state via `name.state`. Advisory warning prompts migration.                            |

## Full example

A complete `states` array for a checkbox component, demonstrating prop states (`selected`, `indeterminate`, `disabled`) and interaction states (`hover`, `keyboard-focus`, `down`). Precedence is omitted because every interaction state uses its canonical default:

```json
"states": [
  {
    "name": "default",
    "description": "Baseline unchecked checkbox appearance.",
    "trigger": "prop"
  },
  {
    "name": "hover",
    "description": "Applied while a pointer device is positioned over the checkbox.",
    "trigger": "interaction"
  },
  {
    "name": "keyboard-focus",
    "description": "Applied while the checkbox holds keyboard focus.",
    "trigger": "interaction"
  },
  {
    "name": "down",
    "description": "Applied while the pointer button or Space key is held down during activation.",
    "trigger": "interaction"
  },
  {
    "name": "selected",
    "description": "Applied when isSelected is true (checkbox checked).",
    "trigger": "prop"
  },
  {
    "name": "indeterminate",
    "description": "Applied when isIndeterminate is true (tri-state mixed selection).",
    "trigger": "prop"
  },
  {
    "name": "disabled",
    "description": "Applied when isDisabled is true. Suppresses all user input.",
    "trigger": "prop"
  }
]
```

If the checkbox is `selected`, `hover` and `down` with `keyboard-focus` active, then for the box fill a token scoped to `["selected", "down"]` wins by specificity. For the ring stroke only `keyboard-focus` defines a token, so it applies. For a property that only `hover` and `keyboard-focus` define, `keyboard-focus` (60) beats `hover` (50).
