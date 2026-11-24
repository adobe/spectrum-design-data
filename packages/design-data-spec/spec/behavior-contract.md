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
* A vector is a `start` state, `steps` (an `intent`, with `via` for focus, or an `input`), and `expect` entries giving the facets and emitted events after a numbered step. `emit` in an expectation lists the events raised by that step only (`{ "change": { "isSelected": true } }`: the event name and the options it changed). A facet expectation may be a string or a boolean (`focusVisible: true`). A vector in a contract or a component suite names intents, not keys: Space versus Enter is a platform binding (see Key bindings), not part of a contract. A key-level vector is an `input` step in a bindings suite. A radio-group vector carries `orientation` in `start`, because arrow keys mirror in right-to-left layouts only when the group is horizontal.

### `wcag`

The contract carries the WCAG criteria that `accessibility.wcag` carries today, as `{ criterion, level, title }` entries. Use the level that fits the claim: the whole contract, one facet (for a criterion about a state) or one part.

### Patterns

A shared base contract is a file in `behaviors/patterns/<pattern>.json` ([`behavior-pattern.schema.json`](../schemas/behavior-pattern.schema.json)): a `pattern` id, an optional `description`, `extends`, and the contract fields several components share (`facets`, `parts`, `transitions`, `wcag`). `publishes` lists the registered interaction facets an extending contract may read. A contract reads `hovered`, `pressed` or `focusVisible` only when a pattern it extends publishes it, so the base is data, not code. `interactive` is the first pattern; `toggle` extends it. SPEC-118 warns when `extends` names no pattern, a pattern extends no pattern, or a pattern publishes a facet that is not a registered interaction facet.

#### The toggle pattern

`toggle` (extends `interactive`) is the shared base of a two-state control: Switch and Checkbox extend it. It declares the `checked` (`unchecked`, `checked`), `disabled` and `readOnly` facets from `isSelected`, `isDisabled` and `isReadOnly`, and one `activate` transition: while the control is neither disabled nor read-only it toggles `isSelected` and emits `change`. A pattern has no `state`, so the extending contract lists those three options in its own `state` (SPEC-118 and SPEC-119 warn when it does not). A contract overrides facets and parts by name (its own entry replaces the pattern's, and a derived pattern's replaces the base's). Its own transitions are tried before the pattern's, so a same-intent transition preempts the pattern's only while its guard holds; when it does not, the pattern's transition is tried next. Checkbox overrides `checked` (adds `indeterminate`) and `activate` (also clears `isIndeterminate`, so an indeterminate or both-true checkbox toggles `isSelected` as a native input does, decisions A509 and A510). A read-only control keeps focus, ignores `activate`, and a part may expose it as `aria-readonly` through `semantics`. A read-only control still shows hover and press feedback (the interactive pattern still sets `hovered` and `pressed`; decision A543): only activation is blocked. Switch and Checkbox map `readOnly` `false` and `true` to `aria-readonly` `"false"` and `"true"`; a platform that omits the attribute when false is still conformant, because the map cannot yet say "absent".

#### Interaction transitions

What an event intent does to an interaction facet is pattern data, in the same transition format as a contract. A transition may add `via` (`keyboard`, `pointer` or `programmatic`: it applies only to an event carrying that `via`) and, in `do.set`, name an interaction facet the pattern publishes with `true` or `false`. `do.raise: "press"` fires the `press` intent of the first part that declares one. It carries no `via`, and it is allowed only on a transition for an event intent, so it cannot re-trigger itself (the runner also stops a nest deeper than 8 as a failure). Transitions are tried in order and the first that matches fires; an event that matches none changes nothing, so a platform without the capability a transition `needs` (`pointer-hover`, `keyboard`) never sets that facet. The `interactive` pattern carries:

| `on`                     | Applies when                | `do`                                 |
| ------------------------ | --------------------------- | ------------------------------------ |
| `focus`, `via: keyboard` | the run has `keyboard`      | `set focusVisible: true`             |
| `focus`                  | any other `via`             | `set focusVisible: false`            |
| `blur`                   |                             | `set focusVisible: false`            |
| `press-start`            |                             | `set pressed: true`                  |
| `press-cancel`           |                             | `set pressed: false`                 |
| `press-end`              | `pressed` is `true`         | `set pressed: false`, `raise: press` |
| `press-end`              | otherwise                   | `set pressed: false`                 |
| `pointer-enter`          | the run has `pointer-hover` | `set hovered: true`                  |
| `pointer-leave`          |                             | `set hovered: false`                 |

A `press-end` with no prior `press-start` (or after `press-cancel`, or while a facet's `blocksInteraction` stopped the start) raises no `press`: a press completes only if it began. SPEC-119 warns when `raise` is on a non-event intent, when a contract (or a pattern it extends) raises `press` and no part declares one, and when a `state` option is named like an interaction facet. It also checks a pattern's transitions: registered intents and capabilities, guards reading only facets the pattern declares or publishes (with their values), and `do` setting a published facet only to a boolean. A pattern's `do` may toggle or set an option, because it names no `state`: SPEC-119 checks it against the `state` of each contract that extends the pattern.

### `blocksInteraction`

A registered facet may list `blocksInteraction`: the event intents that do nothing while the facet is `true`. `disabled` lists `focus`, `press-start` and `pointer-enter`: a disabled control takes no focus, press or hover. `activate` stays an explicit transition guard, as in the Switch example, because a read-only control keeps focus and ignores only activation.

## Facets in recipes

A recipe `when` or `visibleWhen` may carry `facets: { "<facet>": "<value>" }` beside `options` and `states` (`component-visual.schema.json`). It is opt-in and additive: when a recipe compiles, each facet clause folds into the `options` (a state-group facet: the option values its contract maps to that value) and `states` (an interaction facet selected as `"true"`: its `stateName`, for example `hovered` to `hover`) that the solver already reads, so no recipe that omits `facets` changes and a recipe that uses it compiles to the same output as its option form. A facet that cannot be selected never matches, and SPEC-122 warns: no contract, a facet the contract does not declare, an interaction facet no extended pattern publishes, a value the facet lacks, `"false"` on an interaction facet (a recipe cannot test a state's absence), or a value that overlaps an earlier one under first match wins. A facet clause counts as one satisfied condition per option it folds into when conditions are ranked.

## Exemptions

A component that takes no interaction has no contract. [`registry/behavior-exemptions.json`](registry.md#behavior-contract-registries) lists each one by component name with a `reason` from [`registry/exemption-reasons.json`](registry.md#behavior-contract-registries):

| Reason           | Meaning                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `static-text`    | Text that is read, not operated (heading, body, label, help text).                          |
| `static-display` | Presents information or an image and takes no input (badge, status light, avatar, divider). |
| `container`      | Lays out, groups or wraps other components; behavior lives in what it contains.             |
| `sub-part`       | Part of another component, covered by the parent's contract (a color handle).               |
| `decorative`     | Visual embellishment with no meaning for assistive technology.                              |

An exemption is a claim about interaction, not a permanent one: if a platform makes an exempt component pressable or selectable (a selectable thumbnail in a collection), remove the entry and write a contract. A component with an `accessibility.role` reaches its contract through the role and needs no entry. Every other component has a contract or an exemption, never both (SPEC-123).

## Key bindings

A contract names intents, never keys (principle 12). Which key raises which intent is a **per-platform binding**, one file per platform, keyed by `role` (the `role` of a contract part): `behaviors/bindings/<platform>.json`, shaped by [`behavior-bindings.schema.json`](../schemas/behavior-bindings.schema.json). `web` is the only file today. A platform extension may own its file later.

```json
{
  "platform": "web",
  "capabilities": ["pointer-hover", "keyboard", "assistive-activation"],
  "roles": {
    "switch": { "keyboard": [{ "key": "Space", "down": "press-start", "up": "press-end" }] },
    "checkbox": { "keyboard": [{ "key": "Space", "down": "press-start", "up": "press-end" }] }
  }
}
```

* A `keyboard` entry maps one `key` to the event intents (one, or a list in order) it raises on `down` and on `up`. They are the existing press intents, so Space on key up and Enter on key down are both expressible. Timing is `down` and `up` only; key repeat is not a phase. Key names are a fixed list (`Space`, `Enter`, `Escape`, `Tab`, the arrows, `Home`, `End`, `PageUp`, `PageDown`) in the schema. Arrow keys are physical: right-to-left mirroring stays in the `navigate-*` intents.
* A key name is the logical name of the key, not the DOM string. A DOM adapter maps `KeyboardEvent.key` to it: `" "` to `Space`, `Enter`, `Escape`, `Tab`, `Home`, `End`, `PageUp` and `PageDown` to themselves, `ArrowUp`, `ArrowDown`, `ArrowLeft` and `ArrowRight` to themselves (physical direction). Names are case-sensitive, and a single-character key such as `a` is not a name yet. A binding matches the bare key only (decision A544): a key pressed with any modifier (Shift, Control, Alt, Meta) never matches a binding, so Shift+Space does not toggle. A binding has no modifier field, and an `input` step carries none, so the runner has nothing to test; a DOM adapter must drop modified key events before it looks up a binding. Other platforms map their own key events the same way.
* A file holds only entries that were verified against an implementation. A role with no entry has no key binding on that platform; a platform with no keyboard omits `keyboard` from `capabilities` and binds no keys. Touch and assistive entries for other platforms are added when a platform owner supplies verified ones.
* **Web, Switch and Checkbox:** Space toggles, on key up; Enter does not (decision A520). The same holds for the native input, React Spectrum S2, `@ui-sdk/react` and Spectrum Web Components generation 1, as measured by the vector spike.
* **Key vectors** are per platform and role, at `conformance/behavior/bindings/<platform>/<role>.json` (`{ "platform", "role", "vectors" }`), and run against every component whose role-carrying part has that role. A component suite carries a key vector only to override its role's binding. A step is `{ "input": { "key", "phase" } }`. The runner takes the role of the contract's role-carrying part, finds the entries for the key, runs the `down` or `up` intents as steps `via` the keyboard, and does nothing when no entry matches: "Enter does not toggle" is a vector that expects `emit: []`. Key vectors need `keyboard`, so on a platform without it they are not applicable.
* `design-data behavior test <component|--all> [--platform <id>]`: with `--platform` the run has that platform's capabilities (and its key vectors only); without it every platform's key vectors run with that platform's bindings.
* **SPEC-124** `behavior-bindings-well-formed`: a bindings file lists registered capabilities, binds keys only with `keyboard`, and names registered intents that a contract with that role handles.

## Reference runner

`design-data behavior test <component|--all>` runs each conformance vector in `conformance/behavior/<component>.json` (`{ "component", "vectors" }`, the shape of a contract with only `vectors`) against `behaviors/<component>.json`, with no browser. Library function: `design_data_core::behavior::run_dir`. The run has all capabilities unless `--without <capability>` removes one; a vector that needs a missing capability is **not applicable**, neither pass nor fail. The exit code is 1 when any vector fails. Rules the runner applies:

* Options are the state; a missing option reads as `false`. A facet is the first `values` entry that matches.
* An intent fires the first transition for it, in the contract and then in the patterns it extends, whose `via` equals the step's `via` (when the transition has one), whose `needs` the run has and whose `guard` holds, reading the facets from before the step. What the event intents do is the `interactive` pattern's transitions (see Patterns), not code. An intent that no transition, `handles` entry or event intent covers fails the vector.

## Spec sheet derivation

The Figma spec sheet's accessibility section reads role, focus, keyboard intents and WCAG criteria from the contract when the component has one (`design-data spec-sheet`); otherwise from the `accessibility` block. Role is the role of the only part that has one; focus is `true` when any part is a `tab-stop` and `false` when every part is `none` (`roving` is not derivable); keyboard intents are the non-event intents of the transitions, then each part's `press` and `handles`; `wcag` is the contract's list. A field the contract cannot answer exactly keeps the block's value. The component-level `intents` labels (`choose`) have no contract field, so they still come from the block. For Switch and Checkbox the section built from the contract is equal to the one built from the block (a unit test proves it), so sheets are unchanged.

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
3. **Contract.** When every component has a contract or a registered exemption, the `accessibility` block is removed from the schema and the data, and the SPEC-118 to SPEC-120, SPEC-122 and SPEC-123 warnings become errors, per component at zero.

## Validation

The schema shape is checked by `design-data:validate-behaviors` (AJV), which also checks the conformance baseline, as `validate-visuals` does for recipes. The SDK loads `behaviors/` (a sibling of `visuals/`, so a dataset without the directory is valid) and runs these rules, all **warnings** until components migrate:

* **SPEC-118** `behavior-references-resolve`: the component, `state` options, facets, parts and semantics resolve.
* **SPEC-119** `behavior-transitions-well-formed`: intents, capabilities, guards and `do` resolve.
* **SPEC-120** `behavior-vectors-well-formed`: a vector's component, capabilities, steps, start options and expectations resolve.
* **SPEC-122** `recipe-facets-resolve`: a recipe `facets` clause names a facet its component's contract can publish, with a value options or a state can select.
* **SPEC-123** `component-has-contract-or-exemption`: a component with no `accessibility.role` has a contract or a registered exemption, not both, and an exemption's reason is registered.
* **SPEC-124** `behavior-bindings-well-formed`: a platform's key bindings list registered capabilities, bind keys only with `keyboard`, and name registered intents that a contract with that role handles.
