# State model

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the normative **state declaration** object: the named conditions that affect a component's visual appearance or token resolution, declared in the `states` array of a component declaration. State declarations complete the machine-readable contract introduced by the component declaration (see [Component format — States stub](component-format.md#states-stub)) and enable cross-reference validation between tokens and component surfaces.

Scoped under [RFC-A — Component Contract in Design Data Spec](https://github.com/adobe/spectrum-design-data/discussions/832). See also [Component format](component-format.md).

## Introduction

A **component state** is a named condition under which a component's visual presentation differs from its baseline. States drive token resolution: when a component is in a given state, the design system selects tokens scoped to that state name rather than (or layered on top of) the baseline tokens.

State names appear in the `state` field of token name objects (see [Token format — Name object](token-format.md#name-object)). A token with `"state": "hover"` applies only when the component is in the `hover` state. For this cross-reference to be machine-enforceable, state declarations **MUST** be present on the component declaration.

States fall into two trigger types:

* **`prop`** — set by a persistent component API property (e.g. `isDisabled`, `isSelected`). The state remains active until the property value changes.
* **`interaction`** — set by runtime user interaction (hover, focus, pressed, dragging). The state is transient and is cleared when the interaction ends.

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
| `precedence`  | integer | OPTIONAL | Resolution precedence; higher value wins when multiple non-layered states are active simultaneously. Defaults to `0` if omitted.           |
| `layered`     | boolean | OPTIONAL | When `true`, this state composes on top of the winning non-layered state rather than competing with it. Default: `false`.                  |
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

**OPTIONAL.** A non-negative integer indicating this state's weight in the resolution algorithm. When multiple non-layered states are simultaneously active, the state with the highest `precedence` integer wins for token selection.

When `precedence` is omitted, it is treated as `0`.

**RECOMMENDED:** Components **SHOULD** declare explicit `precedence` values when two or more states could be active simultaneously, to avoid relying on declaration-order tie-breaking.

### `layered`

**OPTIONAL.** A boolean indicating whether this state composes on top of the winning non-layered state instead of competing with it. Default: `false`.

When `layered: true`, the state does not participate in the non-layered precedence competition. Instead, after the winning non-layered state is determined, all active `layered: true` states are applied on top of it in order of their `precedence` values (higher precedence layered states apply last / outermost).

Typical use: focus ring states (`focus`, `focus-visible`) that must be visible regardless of whether the component is also in a `hover` or `selected` state.

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

`prop` states are typically mutually exclusive with each other in practice (a component is either disabled or selected, rarely both), but the spec permits multiple `prop` states to be simultaneously active; the precedence algorithm resolves which token set applies.

### `interaction` trigger

An `interaction` state is driven by transient user input. The state is active only while the interaction is occurring and is automatically cleared when the interaction ends.

Examples:

* `hover` — active while a pointer device is positioned over the component's interactive area.
* `focus` — active while the component holds keyboard focus.
* `focus-visible` — active when focus was received via keyboard navigation (not pointer).
* `active` / `pressed` — active while a pointer button or key is held down.
* `dragging` — active while a drag-and-drop gesture originating from the component is in progress.

`interaction` states may overlay `prop` states (e.g. a disabled button may still receive a hover event on some platforms). When both are active, the precedence algorithm determines which token set wins, or, if the interaction state is `layered: true`, the interaction state's tokens are applied on top.

## Precedence and resolution algorithm

The following algorithm is **NORMATIVE** for conforming validators and renderers that implement state-aware token resolution.

**Inputs:** A set of currently active state names for a given component instance.

**Algorithm:**

1. Partition the active states into two groups:
   * **Non-layered states:** states with `layered: false` (or `layered` omitted).
   * **Layered states:** states with `layered: true`.

2. Among non-layered states, select the **winning state**:
   * Compare `precedence` values. The state with the highest `precedence` integer wins.
   * If `precedence` is omitted, treat it as `0`.
   * If two non-layered states tie on `precedence`, the state that appears **earlier** in the component's `states` array wins. **MUST** be treated as a tie; implementations **SHOULD** emit a warning (see SPEC-006 for the analogous cascade tie rule).

3. Resolve tokens for the winning non-layered state. If no non-layered state is active, resolve the `default` state (or baseline tokens when no `default` state is declared).

4. For each active layered state, in ascending `precedence` order (lowest first, so the highest-precedence layered state is applied last and sits outermost):
   * Apply the layered state's tokens on top of the tokens resolved in step 3. Tokens explicitly declared for the layered state override the corresponding tokens from the non-layered resolution.

5. The resulting merged token set is the resolved appearance for the component instance in its current state combination.

**Example:** A checkbox is simultaneously `selected` (precedence 80) and `hover` (precedence 50). `focus` (precedence 60, layered) is also active.

* Non-layered active states: `selected` (80), `hover` (50). Winner: `selected`.
* Layered active state: `focus`. Applied on top of `selected`.
* Resolution: `selected` tokens, with `focus` tokens composited over them.

## Canonical state vocabulary

The following state names are defined by the cross-platform design audit and **SHOULD** be used in preference to custom names when their semantics match. Using canonical names enables cross-component tooling, documentation generation, and token audits.

| Name            | Trigger     | Precedence | Layered | Semantics                                                                 |
| --------------- | ----------- | ---------- | ------- | ------------------------------------------------------------------------- |
| `default`       | —           | 0          | false   | No special state; baseline component appearance.                          |
| `hover`         | interaction | 50         | false   | Pointer device is positioned over the component's interactive area.       |
| `dragging`      | interaction | 55         | false   | A drag-and-drop gesture originating from this component is in progress.   |
| `focus`         | interaction | 60         | true    | Component holds keyboard or programmatic focus.                           |
| `focus-visible` | interaction | 65         | true    | Focus received via keyboard navigation; used for visible focus ring only. |
| `active`        | interaction | 70         | false   | Pointer button or activation key is currently held down.                  |
| `pressed`       | interaction | 70         | false   | Alias for `active`; prefer `active` for new declarations.                 |
| `invalid`       | prop        | 75         | false   | Component value has failed validation.                                    |
| `valid`         | prop        | 75         | false   | Component value has passed validation.                                    |
| `selected`      | prop        | 80         | false   | Component is in a selected state (checkbox checked, tab active, etc.).    |
| `indeterminate` | prop        | 85         | false   | Component has partial selection (tri-state checkbox mixed state).         |
| `read-only`     | prop        | 90         | false   | Component value is visible but not editable by the user.                  |
| `disabled`      | prop        | 100        | false   | Component is non-interactive; all user input is suppressed.               |

Custom state names are permitted. When a custom name is used, the state declaration object **SHOULD** include a `description` field explaining its semantics (rule SPEC-026).

**NORMATIVE:** The values in the canonical vocabulary table (trigger type, precedence, layered) are **RECOMMENDED defaults**. A component declaration MAY override any of these values for a canonical state name by explicitly declaring a different value in the state declaration object. When overriding a canonical default, the `description` **SHOULD** explain the deviation.

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
    "state": "selected"
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

A complete `states` array for a checkbox component, demonstrating prop states (`selected`, `indeterminate`, `disabled`), interaction states (`hover`, `focus` with `layered: true`, `pressed`), and explicit precedence values:

```json
"states": [
  {
    "name": "default",
    "description": "Baseline unchecked checkbox appearance.",
    "trigger": "prop",
    "precedence": 0
  },
  {
    "name": "hover",
    "description": "Applied while a pointer device is positioned over the checkbox.",
    "trigger": "interaction",
    "precedence": 50
  },
  {
    "name": "focus",
    "description": "Applied while the checkbox holds keyboard or programmatic focus. Composes on top of the active non-layered state.",
    "trigger": "interaction",
    "precedence": 60,
    "layered": true
  },
  {
    "name": "pressed",
    "description": "Applied while the pointer button or Space key is held down during activation.",
    "trigger": "interaction",
    "precedence": 70
  },
  {
    "name": "selected",
    "description": "Applied when isSelected is true (checkbox checked).",
    "trigger": "prop",
    "precedence": 80
  },
  {
    "name": "indeterminate",
    "description": "Applied when isIndeterminate is true (tri-state mixed selection).",
    "trigger": "prop",
    "precedence": 85
  },
  {
    "name": "disabled",
    "description": "Applied when isDisabled is true. Suppresses all user input.",
    "trigger": "prop",
    "precedence": 100
  }
]
```

In this example, if the checkbox is simultaneously `selected` (80) and `hover` (50) with `focus` (60, layered) active, the resolution is: `selected` wins the non-layered competition; `focus` tokens are then applied on top of the `selected` tokens.
