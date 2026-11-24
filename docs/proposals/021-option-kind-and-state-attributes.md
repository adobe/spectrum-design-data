<!-- Copyright 2026 Adobe. All rights reserved. -->

# Proposal 021: Option `kind`, state groups and an accessibility cross-check

**Status:** Draft, for discussion. Nothing here is decided and no data changes. Bead `spectrum-design-data-9fe.13`.
**Builds on:** RFC [#2098](https://github.com/adobe/spectrum-design-data/discussions/2098) (behavior vs appearance; its item 1 is the `kind` flag), [#1995](https://github.com/adobe/spectrum-design-data/discussions/1995) (accessibility data).
**Affects:** `component.schema.json` (options, implementation rows), the validator, `spec/accessibility.md`.

## Summary

RFC [#2098](https://github.com/adobe/spectrum-design-data/issues/2098) proposes a `kind` on each option so data can say which options are state (set by interaction or the app) and which are appearance. The ui-sdk spikes (Switch, Checkbox; `tools/ui-sdk-spike` on branch `spike/ui-sdk-frameworks`) show that `kind` alone is not enough for a generator. This proposal adds two small things next to it and one rule:

1. `kind` on options, limited here to `state` and `appearance` (RFC question 1).
2. **State groups**: a neutral, component-level declaration that several state options form one state with named values (Checkbox's `isSelected` and `isIndeterminate` are one tri-state).
3. **State attributes** on the implementation row: what each value is called in one implementation (`data-checked` in ui-sdk).
4. A **validation rule** that compares the `accessibility` block with the options and state groups, the way ui-sdk's `definePrimitive` makes TypeScript compare a slot's `role` with its `focus`, `press` and `keys`.

## How ui-sdk does it

A UI SDK component is one `definePrimitive` object ([docs](https://ui-sdk.dev/docs/core/kernel/define-a-primitive)):

* `options` lists each option with a kind (`string`, `boolean`, `callback`, `id`, `key`, ...). Adapters decide per framework how to expose it.
* `state` holds the state. Each slot has a pure `attrs(state)` that produces the attributes CSS keys on, using helpers such as `checkedAttrs(checked)`, which returns `data-checked`, `data-unchecked` or `data-indeterminate`. Part names become `data-slot` (`checkbox`, `checkbox-indicator`).
* A slot's `role` forces `focus`, `press` and `keys` to be declared, and limits which ARIA attributes `attrs` may return (`aria-checked` is required on a checkbox; `aria-orientation` on a group is an error).

So state versus appearance is not a flag there. State is the thing `attrs` renders; everything else is the author's.

## What we have

* `accessibility` per component: `role`, `intents`, `focusable`, `keyboardIntents`, `wcag`. 33 of 97 components declare a `role`. It is descriptive: nothing checks it against the rest of the declaration.
* `states` for interaction states (`hover`, `down`, `keyboard-focus`), with precedence.
* `options` as one flat map. `isSelected`, `isIndeterminate`, `isDisabled` and `isError` sit beside `size` and `isEmphasized` with nothing to tell them apart.

What the spikes had to hard-code (README gap list): which options are state, that Checkbox's two booleans are one tri-state, and the attribute names.

## Proposal

### 1. `kind` on options

As in RFC [#2098](https://github.com/adobe/spectrum-design-data/issues/2098), limited to two values for now. `state`: changes while the user interacts or is set by the app to reflect a condition. `appearance`: chosen by the author. An option without `kind` is unspecified, so this is additive.

### 2. State groups (component level, implementation-neutral)

```json
"stateGroups": [
  {
    "name": "checked",
    "values": [
      { "name": "unchecked", "when": { "isSelected": false, "isIndeterminate": false } },
      { "name": "checked", "when": { "isSelected": true, "isIndeterminate": false } },
      { "name": "indeterminate", "when": { "isIndeterminate": true } }
    ]
  }
]
```

Switch has the same shape with two values (`unchecked`, `checked`) from `isSelected`. `isDisabled` and `isError` are single-option groups with `true` and `false` values and need no entry: a state option that is in no group is its own boolean group.

Rules: the options a group names must be `kind: "state"`; its values must cover every combination (like SPEC-066's coverage rule for recipes) and be mutually exclusive.

### 3. State attributes (on the implementation row)

```json
{
  "platform": "web",
  "implementation": "ui-sdk",
  "componentName": "Checkbox",
  "parts": { "box": "checkbox", "checkmark": "checkbox-indicator", "dash": "checkbox-indicator" },
  "stateAttributes": {
    "checked": { "unchecked": "data-unchecked", "checked": "data-checked", "indeterminate": "data-indeterminate" },
    "isDisabled": { "true": "data-disabled" },
    "isError": { "true": "data-invalid" }
  }
}
```

`parts` is item 4 of RFC [#2098](https://github.com/adobe/spectrum-design-data/issues/2098). Together they are exactly the `components` table in `generate.mjs`, moved into data: an exporter reads the group's values and the row's attribute names, and nothing is hard-coded per component. Appearance options (`size`, `isEmphasized`) have no entry; the exporter emits its own attribute for them, as the spike did with `data-size` and `data-variant`.

### 4. Cross-check with `accessibility` (new validator rule, warning)

A role implies what the declaration must contain, as in ui-sdk's role-driven requirements. Rule ids are provisional, after SPEC-117.

| Check                                                          | Example                                                                                                                                                                                             |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A role that takes focus declares `focusable`                   | `checkbox`, `switch`, `radio`, `button`, `slider`, `combobox`, `tab`, `textbox`, `link`, `menuitem`                                                                                                 |
| `keyboardIntents` contains the role's required intents         | `checkbox`/`switch`/`radio`/`button`/`tab`: `activate`; `slider`/`spinbutton`: `increment`, `decrement`; `combobox`: `expand`, `collapse`, `navigate-options`; `listbox`/`menu`: `navigate-options` |
| A checked-like role has a state group with at least two values | `checkbox`, `switch`, `radio` (maps to `aria-checked`); `tab` and `option` map to `aria-selected`                                                                                                   |
| A group with an `indeterminate` value is on a `checkbox` role  | `checkbox` only                                                                                                                                                                                     |
| `blocksInteraction` states and `isDisabled` agree              | an option `isDisabled` with `kind: "state"` and no state marked `blocksInteraction`, or the reverse                                                                                                 |

Measured on `main` (97 components, 33 with a role): every role that takes focus declares `focusable`, and all 16 components whose role is in the table above already have the required `keyboardIntents`. So the first two checks are silent today and only guard new data. The third needs `stateGroups`, so it starts with no findings and ratchets as groups are added.

## What this does not do

It does not model behavior (keyboard maps, focus management, state machines): UI SDK and React Aria own those, and a copy in data would be worse. It does not require every state option to be in a group. It does not choose ui-sdk as a supported implementation; the row above is an example (RFC [#2098](https://github.com/adobe/spectrum-design-data/issues/2098) question 6).

## Open questions

1. Are state groups worth a new block, or should `kind: "state"` plus a per-option `values` on the option be enough? Checkbox's tri-state is the one case that needs two options merged.
2. Should the attribute names live on the implementation row, or in a registry per implementation (shared by every component, since `data-checked` and `data-disabled` repeat)?
3. Should the role-to-requirements table live in the spec, in the role registry that [#1995](https://github.com/adobe/spectrum-design-data/issues/1995) sketches, or in the validator?
4. Warning or error for the cross-check, and should a component be allowed to opt out with a reason, like `{ none: "why" }` in ui-sdk?

## Evidence

* Spikes: Switch and Checkbox generated from recipes, checked against the renderer in React, Solid, Vue, Svelte and web components (0 differences, 32 and 96 combinations per scheme). `tools/ui-sdk-spike/README.md` lists the hard-coded entries this proposal would replace.
* Counts above come from `packages/design-data/components/*.json` on `main`, 2026-11-23.
