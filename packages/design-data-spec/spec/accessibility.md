# Accessibility

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This chapter defines the **semantic accessibility vocabulary** that component declarations carry at the foundation layer. A component's accessibility declaration expresses intent — its semantic role, interaction purposes, focus behavior, and applicable WCAG criteria — without encoding platform-specific APIs. Platform adapter repos translate this vocabulary to ARIA attributes, iOS UIAccessibility traits, Android AccessibilityNodeInfo properties, and other platform contracts.

This mirrors how the cascade defines foundation→platform layering for tokens: the spec ships the vocabulary; platform repos ship the mapping.

Scoped under planned RFC-B. See [rfc-coordination.md](../docs/rfc-coordination.md).

## Accessibility declaration

The `accessibility` object is an optional top-level field on a [component declaration](component-format.md). When present, it MUST conform to [`accessibility.schema.json`](../schemas/accessibility.schema.json) (schema added in Phase 7.3).

### Fields

| Field             | Type      | Required | Description                                              |
| ----------------- | --------- | -------- | -------------------------------------------------------- |
| `role`            | string    | No       | Semantic role from the canonical role vocabulary         |
| `intents`         | string\[] | No       | Semantic interaction intents                             |
| `focusable`       | boolean   | No       | Whether the component receives keyboard focus by default |
| `keyboardIntents` | string\[] | No       | Keyboard interaction intents when focused                |
| `wcag`            | object\[] | No       | Applicable WCAG 2.x success criteria                     |

**NORMATIVE:** An `accessibility` object SHOULD contain at least one field. An empty `accessibility` object provides no semantic value.

> **Note:** Anatomy parts (see [Anatomy format](anatomy-format.md)) do not carry an
> `accessibility` field at this spec version. Component-level accessibility applies to the
> component as a whole. Per-part accessibility semantics are deferred to Phase 7.3.

### `role`

The `role` field names the semantic role of the component. It maps conceptually to ARIA widget and landmark roles, iOS `UIAccessibilityTraits`, Android role descriptions, and equivalent constructs on other platforms — but it is **not** a direct ARIA attribute. Platform adapters perform the translation.

**NORMATIVE:** Custom values (outside the canonical vocabulary below) are permitted. When using a custom value, the component SHOULD include a `description` field that documents the role's semantics.

**Canonical role vocabulary:**

| Value        | Semantic meaning                                    |
| ------------ | --------------------------------------------------- |
| `button`     | Triggers a discrete action                          |
| `checkbox`   | Binary on/off selection                             |
| `combobox`   | Combined text input with a selectable option list   |
| `dialog`     | Modal overlay requiring a user response             |
| `link`       | Navigates the user to another context               |
| `listbox`    | Selectable list of options                          |
| `menu`       | List of commands or options                         |
| `menuitem`   | Individual item within a menu                       |
| `radio`      | Single-select option within a group                 |
| `slider`     | Range input with a continuous value                 |
| `spinbutton` | Numeric input with increment and decrement controls |
| `switch`     | Toggles between two states (on/off)                 |
| `tab`        | Selects a panel within a tabbed interface           |
| `textbox`    | Accepts free-form text input                        |
| `tooltip`    | Contextual information overlay; not interactive     |
| `tree`       | Hierarchical navigable list                         |

### `intents`

The `intents` array lists the semantic interaction purposes the component supports. Multiple intents are permitted — a combobox, for example, both accepts text input and selects from a list.

Platform adapters use `intents` to determine which ARIA properties, traits, or accessibility attributes to apply.

**Canonical intent vocabulary:**

| Value      | Meaning                                    |
| ---------- | ------------------------------------------ |
| `trigger`  | Activates or invokes an action             |
| `select`   | Selects from a set of options              |
| `navigate` | Moves the user to another context          |
| `expand`   | Reveals additional content                 |
| `collapse` | Conceals content                           |
| `input`    | Accepts user-typed text                    |
| `choose`   | Picks a value from a range or discrete set |
| `dismiss`  | Closes or removes an element               |

### `focusable`

The `focusable` boolean declares whether the component receives keyboard focus via the Tab key by default.

* `true` — the component is in the tab order; platform adapters set `tabindex="0"` or the platform equivalent.
* `false` — the component is not in the tab order; child elements may still be individually
  focusable. Components that manage focus internally (radio groups, toolbars, tree views)
  use the roving `tabindex` pattern — one child is focusable at a time. For these, set
  `focusable: false`; the platform adapter manages which child holds `tabindex="0"`.
* When absent, focus behavior is unspecified at the foundation layer.

### `keyboardIntents`

The `keyboardIntents` array lists the keyboard interaction intents the component responds to when focused. Platform adapters use this to bind keyboard event handlers.

**RECOMMENDED:** Where a `keyboardIntents` value has a direct semantic equivalent in `intents`,
both SHOULD be declared. For example, a component with `expand` in `intents` SHOULD also include
`expand` in `keyboardIntents`. Keyboard-specific intents such as `activate`, `navigate-options`,
and `navigate-items` have no `intents` counterpart and are keyboard-only.

**Canonical keyboard intent vocabulary:**

| Value              | Default key(s)          | Meaning                                                 |
| ------------------ | ----------------------- | ------------------------------------------------------- |
| `activate`         | Enter, Space            | Triggers the component's primary action                 |
| `expand`           | Space, Enter, ArrowDown | Reveals associated content                              |
| `collapse`         | Escape, ArrowUp         | Conceals associated content                             |
| `navigate-options` | ArrowUp, ArrowDown      | Moves focus through a list of options                   |
| `navigate-items`   | ArrowLeft, ArrowRight   | Moves focus between peer elements (tabs, toolbar items) |
| `increment`        | ArrowUp, ArrowRight     | Increases a numeric or ranged value                     |
| `decrement`        | ArrowDown, ArrowLeft    | Decreases a numeric or ranged value                     |
| `dismiss`          | Escape                  | Closes or cancels                                       |
| `select-all`       | Ctrl+A                  | Selects all items in a collection                       |

The "Default key(s)" column is informative. Platform adapters determine actual key bindings; the foundation layer declares intent only.

### `wcag`

The `wcag` array lists the WCAG 2.x success criteria applicable to this component. Entries are objects with the following fields:

| Field       | Type   | Required | Description                                  |
| ----------- | ------ | -------- | -------------------------------------------- |
| `criterion` | string | Yes      | WCAG criterion number, e.g. `"1.3.1"`        |
| `level`     | string | Yes      | Conformance level: `"A"`, `"AA"`, or `"AAA"` |
| `title`     | string | No       | Human-readable criterion title               |

**NORMATIVE:** `criterion` MUST be a valid WCAG 2.x criterion number in
`"<principle>.<guideline>.<criterion>"` format, where `<principle>` is 1–4 (matching WCAG 2.x
principles: Perceivable, Operable, Understandable, Robust). `level` MUST be one of `"A"`,
`"AA"`, or `"AAA"`.

Example `wcag` entry:

```json
{ "criterion": "4.1.2", "level": "A", "title": "Name, Role, Value" }
```

## State-level accessibility fields

State declarations (see [State model](state-model.md)) MAY carry the following additional fields that describe how assistive technology responds to state transitions. These fields extend the base state declaration object defined in `spec/state-model.md`.

| Field               | Type    | Required | Description                                               |
| ------------------- | ------- | -------- | --------------------------------------------------------- |
| `announce`          | string  | No       | Screen-reader announcement hint for this state transition |
| `communicates`      | string  | No       | Semantic meaning conveyed to AT when this state is active |
| `blocksInteraction` | boolean | No       | Whether this state prevents all user interaction          |

### `announce`

A hint string used by platform adapters to populate ARIA live regions or post accessibility notifications when the state is entered. The text is a template hint, not a final user-facing string — platform implementations localize and adapt it.

**RECOMMENDED:** Phrasing SHOULD be concise (under 10 words) and describe the transition, not the resulting state. Prefer `"Dialog opened"` over `"The dialog is now open"`.

### `communicates`

A string describing the semantic state the component is in after the transition. Platform adapters use this to set `aria-*` state attributes or equivalent:

| Example value | ARIA equivalent        |
| ------------- | ---------------------- |
| `"selected"`  | `aria-selected="true"` |
| `"expanded"`  | `aria-expanded="true"` |
| `"checked"`   | `aria-checked="true"`  |
| `"invalid"`   | `aria-invalid="true"`  |
| `"required"`  | `aria-required="true"` |
| `"busy"`      | `aria-busy="true"`     |
| `"pressed"`   | `aria-pressed="true"`  |
| `"disabled"`  | `aria-disabled="true"` |

The ARIA mapping column is informative; the foundation layer declares semantic meaning only.

### `blocksInteraction`

A boolean declaring whether this state prevents all user interaction with the component.

* `true` — the component cannot be interacted with while in this state (e.g., `disabled`, `loading`); platform adapters SHOULD set `aria-disabled` or equivalent.
* `false` or absent — user interaction is not blocked by this state.

## Example

A `button` component with a complete accessibility declaration and two states carrying state-level accessibility fields:

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
      { "criterion": "4.1.2", "level": "A", "title": "Name, Role, Value" },
      { "criterion": "1.4.3", "level": "AA", "title": "Contrast (Minimum)" }
    ]
  },
  "states": [
    {
      "name": "disabled",
      "trigger": { "type": "prop", "prop": "disabled" },
      "announce": "Button disabled",
      "communicates": "disabled",
      "blocksInteraction": true
    },
    {
      "name": "loading",
      "trigger": { "type": "prop", "prop": "pending" },
      "announce": "Loading",
      "communicates": "busy",
      "blocksInteraction": true
    }
  ]
}
```

## SPEC rules

| Rule ID  | Severity | Name                       | Assert                                                                                 |
| -------- | -------- | -------------------------- | -------------------------------------------------------------------------------------- |
| SPEC-030 | warning  | accessibility-empty        | When `accessibility` is declared with no fields, the object provides no semantic value |
| SPEC-031 | warning  | accessibility-wcag-missing | When `accessibility` is declared, `wcag` SHOULD list at least one criterion            |

Both rules are `warning` severity — they do not block validation. Rules are defined in `rules/rules.yaml` and implemented in the SDK in Phase 7.4.
