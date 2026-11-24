# Behavior contract

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the **behavior contract**: one file per component, `behaviors/<component>.json`, that states what a component does as data. It names which options are state, what each intent does to them, which facets the appearance layer may read, each part's role and focus model, and a set of conformance vectors. The contract never mentions tokens or dimensions; a recipe may read only the facets it publishes.

Status: **draft**. [Proposal 022](../../../docs/proposals/022-behavior-contract.md) is the source for the format, its worked examples (Switch, Checkbox) and its open questions. This page states what the schema and the validator enforce today. The schema is [`behavior.schema.json`](../schemas/behavior.schema.json); shared base contracts use [`behavior-pattern.schema.json`](../schemas/behavior-pattern.schema.json). Switch and Checkbox are the first contracts, with their vectors in `conformance/behavior/`; no other component has one yet.

## The file

| Field         | Type      | Description                                                                                               |
| ------------- | --------- | --------------------------------------------------------------------------------------------------------- |
| `component`   | string    | The component declaration this contract describes. **Required.**                                          |
| `extends`     | string\[] | Shared base contracts: names of files in `behaviors/patterns/`, for example `interactive` (see Patterns). |
| `state`       | string\[] | Option ids the contract owns. The option stays the source; the contract does not redeclare it.            |
| `facets`      | object    | Facet id to its derivation from `state` options (see Facets).                                             |
| `parts`       | object    | Anatomy part name to `role`, `focus`, `press`, `handles`, `wcag`.                                         |
| `transitions` | object\[] | Guarded table: `on` (intent), `needs`, `guard`, `do`, `emit`.                                             |
| `semantics`   | object    | Part, then facet, to the accessibility state it exposes (`ariaState`, `map`).                             |
| `wcag`        | object\[] | WCAG 2.x criteria that apply to the whole contract. Also allowed on a facet and on a part.                |
| `vectors`     | object\[] | Conformance vectors: `start`, `steps`, `expect`, optional `needs`.                                        |

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

A transition is triggered by an **intent**, never a DOM event. The registry [`registry/intents.json`](registry.md#behavior-contract-registries) reuses, unchanged, the vocabularies of the `intents` and `keyboardIntents` arrays of the [`accessibility`](accessibility.md) block: `trigger`, `select`, `navigate`, `expand`, `collapse`, `input`, `choose`, `dismiss` (`intents`) and `activate`, `expand`, `collapse`, `navigate-options`, `navigate-items`, `increment`, `decrement`, `dismiss`, `select-all` (`keyboardIntents`). The registry also holds the **event** intents (`category: event`) that a platform maps a gesture to: `focus` (with `via`: `keyboard`, `pointer` or `programmatic`), `blur`, `press-start`, `press-end`, `press-cancel`, `pointer-enter`, `pointer-leave`, `navigate-next`, `navigate-previous`, `navigate-first` and `navigate-last`. They exist only in contracts, never in the `accessibility` block. Nothing else is registered.

### Capabilities

A transition or vector may require a capability from [`registry/capabilities.json`](registry.md#behavior-contract-registries): `pointer-hover`, `keyboard`, `assistive-activation`. An implementation on a platform without it neither runs nor fails the vectors that need it, and its facet (`hovered`) never becomes true.

### Parts, transitions, semantics, vectors

* `parts` keys are anatomy part names. `role` is a role from the [accessibility role vocabulary](accessibility.md#role); a component-level role goes on the root or primary part, chosen per component (Switch: `track`, Checkbox: `box`). `focus` is `tab-stop` (in the tab order), `roving` (one peer is the tab stop at a time) or `none`. `press` is the intent a completed press produces. `handles` lists the intents the part handles that **change no state** (`navigate-items`, `increment`): an intent that changes state is a transition instead.
* A `guard` is `{ "facet", "is" }`, or `all`, `any` or `not` of guards. `do` is `{ "toggle": option }` or `{ "set": { option: value } }`, where a value is a literal or `{ "not": guard }`. `emit` names the event raised.
* `semantics` maps a facet value to what assistive technology reads, per part. `ariaState` is the ARIA attribute for web; other platforms map the same facet value through their own adapter.
* A vector is a `start` state, `steps` (an `intent`, with `via` for focus), and `expect` entries giving the facets and emitted events after a numbered step. `emit` in an expectation lists the events raised by that step only (`{ "change": { "isSelected": true } }`: the event name and the options it changed). A facet expectation may be a string or a boolean (`focusVisible: true`). A vector says nothing about keys: Space versus Enter is a platform mapping of `activate`, not part of a contract. A radio-group vector carries `orientation` in `start`, because arrow keys mirror in right-to-left layouts only when the group is horizontal.

### `wcag`

The contract carries the WCAG criteria that `accessibility.wcag` carries today, as `{ criterion, level, title }` entries. Use the level that fits the claim: the whole contract, one facet (for a criterion about a state) or one part.

### Patterns

A shared base contract is a file in `behaviors/patterns/<pattern>.json` ([`behavior-pattern.schema.json`](../schemas/behavior-pattern.schema.json)): a `pattern` id, an optional `description`, `extends`, and the contract fields several components share (`facets`, `parts`, `transitions`, `wcag`). `publishes` lists the registered interaction facets an extending contract may read. A contract reads `hovered`, `pressed` or `focusVisible` only when a pattern it extends publishes it, so the base is data, not code. `interactive` is the first pattern. SPEC-118 warns when `extends` names no pattern, a pattern extends no pattern, or a pattern publishes a facet that is not a registered interaction facet.

### `blocksInteraction`

A registered facet may list `blocksInteraction`: the event intents that do nothing while the facet is `true`. `disabled` lists `focus`, `press-start` and `pointer-enter`: a disabled control takes no focus, press or hover. `activate` stays an explicit transition guard, as in the Switch example, because a read-only control keeps focus and ignores only activation.

## Reference runner

`design-data behavior test <component|--all>` runs each conformance vector in `conformance/behavior/<component>.json` (`{ "component", "vectors" }`, the shape of a contract with only `vectors`) against `behaviors/<component>.json`, with no browser. Library function: `design_data_core::behavior::run_dir`. The run has all capabilities unless `--without <capability>` removes one; a vector that needs a missing capability is **not applicable**, neither pass nor fail. The exit code is 1 when any vector fails. Rules the runner applies:

* Options are the state; a missing option reads as `false`. A facet is the first `values` entry that matches.
* `focus` via `keyboard` sets `focusVisible`; `blur` clears it; `press-start` and `press-cancel` set and clear `pressed`; `pointer-enter` and `pointer-leave` set and clear `hovered`; `press-end` clears `pressed` and raises the `press` intent of the first part that has one. These apply only to facets a pattern publishes.
* Any other intent fires the first transition for it whose `needs` the run has and whose `guard` holds, reading the facets from before the step. An intent that no transition, event or `handles` entry covers fails the vector.

## Where each `accessibility` field goes

| `accessibility` field                                 | Home in the contract                                                                                                                                                                                                             |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `role`                                                | `parts.<part>.role`. Which part carries a component-level role is decided per component.                                                                                                                                         |
| `focusable`                                           | `parts.<part>.focus`: `true` is `tab-stop`, `false` with roving focus is `roving`, `false` otherwise is `none`.                                                                                                                  |
| `wcag`                                                | `wcag`, on the contract, a facet or a part.                                                                                                                                                                                      |
| `keyboardIntents`                                     | `transitions[].on` and `parts.<part>.press` when the intent changes state; `parts.<part>.handles` when it changes none (for example `navigate-items`).                                                                           |
| `intents`                                             | **No home.** These label what a component is for (`trigger`, `choose`); no contract field says so. Open question.                                                                                                                |
| state `announce`, `communicates`, `blocksInteraction` | `communicates` overlaps `semantics`; `blocksInteraction` is a facet property in `registry/facets.json` (see `blocksInteraction`); `announce` is dropped. No component data sets any of them, so only the schema and docs change. |

## Expand, migrate, contract

1. **Expand.** The schema, the facet, intent and capability registries, patterns, the reference runner and the warnings below exist. The `accessibility` block stays; nothing reads the contract at render time.
2. **Migrate.** A component gains `behaviors/<component>.json` carrying everything its `accessibility` block says, per the table above. Both forms coexist, and renders and spec sheets stay byte-identical. Recipes then move from options to facets in their `when` clauses, per component.
3. **Contract.** When every component has a contract or a registered exemption, the `accessibility` block is removed from the schema and the data, and the SPEC-118 to SPEC-120 warnings become errors, per component at zero.

## Validation

The schema shape is checked by `design-data:validate-behaviors` (AJV), which also checks the conformance baseline, as `validate-visuals` does for recipes. The SDK loads `behaviors/` (a sibling of `visuals/`, so a dataset without the directory is valid) and runs three rules, all **warnings** until components migrate:

* **SPEC-118** `behavior-references-resolve`: the component, `state` options, facets, parts and semantics resolve.
* **SPEC-119** `behavior-transitions-well-formed`: intents, capabilities, guards and `do` resolve.
* **SPEC-120** `behavior-vectors-well-formed`: a vector's component, capabilities, steps, start options and expectations resolve.
