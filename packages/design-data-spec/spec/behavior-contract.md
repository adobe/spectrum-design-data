# Behavior contract

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the **behavior contract**: one file per component, `behaviors/<component>.json`, that states what a component does as data. It names which options are state, what each intent does to them, which facets the appearance layer may read, each part's role and focus model, and a set of conformance vectors. The contract never mentions tokens or dimensions; a recipe may read only the facets it publishes.

Status: **draft**. [Proposal 022](../../../docs/proposals/022-behavior-contract.md) is the source for the format, its worked examples (Switch, Checkbox) and its open questions. This page states what the schema and the validator enforce today. The schema is [`behavior.schema.json`](../schemas/behavior.schema.json). No component has a contract yet.

## The file

| Field         | Type      | Description                                                                                                  |
| ------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| `component`   | string    | The component declaration this contract describes. **Required.**                                             |
| `extends`     | string\[] | Shared base contracts, for example `interactive`. Syntax only in this slice: no base file exists to resolve. |
| `state`       | string\[] | Option ids the contract owns. The option stays the source; the contract does not redeclare it.               |
| `facets`      | object    | Facet id to its derivation from `state` options (see Facets).                                                |
| `parts`       | object    | Anatomy part name to `role`, `focus`, `press` and `wcag`.                                                    |
| `transitions` | object\[] | Guarded table: `on` (intent), `needs`, `guard`, `do`, `emit`.                                                |
| `semantics`   | object    | Part, then facet, to the accessibility state it exposes (`ariaState`, `map`).                                |
| `wcag`        | object\[] | WCAG 2.x criteria that apply to the whole contract. Also allowed on a facet and on a part.                   |
| `vectors`     | object\[] | Conformance vectors: `start`, `steps`, `expect`, optional `needs`.                                           |

### Facets

A facet is a named, finite-valued view of state. [`registry/facets.json`](registry.md#behavior-contract-registries) lists each facet id and its values, and whether it comes from a state group (`state-group`, derived from options the component declares) or from the shared `interactive` base (`interaction`: `hovered`, `pressed`, `focusVisible`). An interaction facet also carries `stateName`, the interaction state name (`states.json`) a recipe resolves against: `hovered` to `hover`, `pressed` to `down`, `focusVisible` to `keyboard-focus`. `states` stays on the component for token identity; the names a recipe resolves against are derived from facets.

A contract declares each state-group facet it uses: `from` names one option or several, and `values` maps each facet value to the option value that selects it. With several sources the values are object matches tried in order (`"order": "first match wins"`). Checkbox keeps `isSelected` and `isIndeterminate` as booleans and derives the tri-state `checked` (`unchecked`, `checked`, `indeterminate`) this way:

```json
"checked": {
  "from": ["isSelected", "isIndeterminate"],
  "values": {
    "indeterminate": { "isIndeterminate": true },
    "checked": { "isIndeterminate": false, "isSelected": true },
    "unchecked": { "isIndeterminate": false, "isSelected": false }
  },
  "order": "first match wins"
}
```

### Intents

A transition is triggered by an **intent**, never a DOM event. The registry [`registry/intents.json`](registry.md#behavior-contract-registries) reuses, unchanged, the vocabularies of the `intents` and `keyboardIntents` arrays of the [`accessibility`](accessibility.md) block: `trigger`, `select`, `navigate`, `expand`, `collapse`, `input`, `choose`, `dismiss` (`intents`) and `activate`, `expand`, `collapse`, `navigate-options`, `navigate-items`, `increment`, `decrement`, `dismiss`, `select-all` (`keyboardIntents`). Nothing else is registered. The proposal's event intents (`focus`, `blur`, `press-start`, `press-end`, `press-cancel`, `pointer-enter`, `pointer-leave`, `navigate-next`, `navigate-previous`, `navigate-first`, `navigate-last`) do not exist today and are not in the registry; a transition or vector that uses one gets a SPEC-119 or SPEC-120 warning until the owner adds it.

### Capabilities

A transition or vector may require a capability from [`registry/capabilities.json`](registry.md#behavior-contract-registries): `pointer-hover`, `keyboard`, `assistive-activation`. An implementation on a platform without it neither runs nor fails the vectors that need it, and its facet (`hovered`) never becomes true.

### Parts, transitions, semantics, vectors

* `parts` keys are anatomy part names. `role` is a role from the [accessibility role vocabulary](accessibility.md#role). `focus` is `tab-stop` (in the tab order), `roving` (one peer is the tab stop at a time) or `none`. `press` is the intent a completed press produces.
* A `guard` is `{ "facet", "is" }`, or `all`, `any` or `not` of guards. `do` is `{ "toggle": option }` or `{ "set": { option: value } }`, where a value is a literal or `{ "not": guard }`. `emit` names the event raised.
* `semantics` maps a facet value to what assistive technology reads, per part. `ariaState` is the ARIA attribute for web; other platforms map the same facet value through their own adapter.
* A vector is a `start` state, `steps` (an `intent`, with `via` for focus), and `expect` entries giving the facets and emitted events after a numbered step. A radio-group vector carries `orientation` in `start`, because arrow keys mirror in right-to-left layouts only when the group is horizontal.

### `wcag`

The contract carries the WCAG criteria that `accessibility.wcag` carries today, as `{ criterion, level, title }` entries. Use the level that fits the claim: the whole contract, one facet (for a criterion about a state) or one part.

## Where each `accessibility` field goes

| `accessibility` field                                 | Home in the contract                                                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `role`                                                | `parts.<part>.role`. Which part carries a component-level role is decided per component.                                                                                  |
| `focusable`                                           | `parts.<part>.focus`: `true` is `tab-stop`, `false` with roving focus is `roving`, `false` otherwise is `none`.                                                           |
| `wcag`                                                | `wcag`, on the contract, a facet or a part.                                                                                                                               |
| `keyboardIntents`                                     | `transitions[].on` and `parts.<part>.press` when the intent changes state. **No home** for an intent that changes no state (for example `navigate-items`): open question. |
| `intents`                                             | **No home.** These label what a component is for (`trigger`, `choose`); no contract field says so. Open question.                                                         |
| state `announce`, `communicates`, `blocksInteraction` | `communicates` overlaps `semantics`; `announce` and `blocksInteraction` have **no home**. Open question.                                                                  |

## Expand, migrate, contract

1. **Expand (this slice).** The schema, the facet, intent and capability registries and the warnings below exist. The `accessibility` block stays; nothing reads the contract at render time.
2. **Migrate.** A component gains `behaviors/<component>.json` carrying everything its `accessibility` block says, per the table above. Both forms coexist, and renders and spec sheets stay byte-identical. Recipes then move from options to facets in their `when` clauses, per component.
3. **Contract.** When every component has a contract or a registered exemption, the `accessibility` block is removed from the schema and the data, and the SPEC-118 to SPEC-120 warnings become errors, per component at zero.

## Validation

The schema shape is checked by `design-data:validate-behaviors` (AJV), which also checks the conformance baseline, as `validate-visuals` does for recipes. The SDK loads `behaviors/` (a sibling of `visuals/`, so a dataset without the directory is valid) and runs three rules, all **warnings** while no component has a contract:

* **SPEC-118** `behavior-references-resolve`: the component, `state` options, facets, parts and semantics resolve.
* **SPEC-119** `behavior-transitions-well-formed`: intents, capabilities, guards and `do` resolve.
* **SPEC-120** `behavior-vectors-well-formed`: a vector's component, capabilities, steps, start options and expectations resolve.
