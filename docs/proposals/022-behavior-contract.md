<!-- Copyright 2026 Adobe. All rights reserved. -->

# Proposal 022: A platform-agnostic behavior contract

**Status:** Draft, for discussion. Nothing here is decided and no data changes. Bead `spectrum-design-data-9fe.13`.
**Builds on:** [proposal 021](021-option-kind-and-state-attributes.md) (option `kind`, state groups, state attributes), RFC [#2098](https://github.com/adobe/spectrum-design-data/discussions/2098) (behavior vs appearance).
**Affects:** a new `behaviors/` directory and schema, `registry/facets.json`, the `accessibility` block of component declarations, recipe `when` clauses (facets only), `packages/design-data-spec/conformance/`.
**Scope of the first slice:** switch, checkbox, radio-button (with its group), action-button (the selectable case). No popups, collections or gestures.

## Summary

A component today says what exists (options, anatomy, states) and how it looks (recipe). What it does is prose plus an `accessibility` block (`role`, `focusable`, `keyboardIntents`) that nothing checks. This proposal adds one file per component, `behaviors/<component>.json`, that states the behavior as data: which options are state, what each intent does to them, which facets the appearance layer may read, what each part's role and focus model are, and a set of test vectors. Any implementation (React Spectrum, Spectrum Web Components, iOS, a ui-sdk or React Aria wrapper) can run the vectors and either pass or show a gap.

The contract is separate from appearance by construction: the contract never mentions tokens or dimensions, and a recipe may read only the facets the contract publishes.

## Why

* **Nothing can fail today.** `accessibility` says a switch is focusable and handles `activate`. No data says what `activate` does, so "RSP and SWC behave the same" is unchecked.
* **Appearance reads behavior directly.** Recipes `when` on options and interaction states (`isSelected`, `hover`). The ui-sdk spikes had to hard-code which of those are state, that Checkbox's two booleans form one tri-state, and the attribute names (proposal 021).
* **Two homes for the same facts.** Role, focus and keyboard behavior live in `accessibility`; the state an option exposes lives in the option and in the `states` array; proposal 021's cross-check exists only to keep them in agreement, which principle 1 of `data-principles.md` calls a smell.

## Fit with the data principles

| Principle                          | How this proposal meets it                                                                                                                                                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 One source per fact              | The contract is the single source for role, focus, intents and transitions. `accessibility` is migrated into it (open question 1). Vectors are generated from the transition table or checked against it, never hand-kept in parallel. Token-facing state names are derived from facets (below). |
| 2 Identity is structured           | A transition, part reference or vector names options, facets and anatomy parts by id. No prose in identity.                                                                                                                                                                                      |
| 3 Fix the data, do not add a field | `states` and `accessibility` cannot say what an intent does to state, so a new file is warranted. It adds no field to existing records.                                                                                                                                                          |
| 4 Vocabularies do not overlap      | New registries: `facets` and `intents`. Intents extend today's `intents` and `keyboardIntents` vocabularies instead of adding a second one. Facet names are checked against option names and state names (open question 4).                                                                      |
| 5 Rank sources                     | Behavior sources rank React Spectrum S2 (built on React Aria), then SWC. Figma carries none. A gap is assumed, recorded as a `needs-decision` bead, and the slice carries on.                                                                                                                    |
| 7 Prove neutrality                 | Moving a recipe from options to facets must render byte-identically. A per-component behavior level ratchets, and warnings become errors at zero per component.                                                                                                                                  |
| 8 Small slices                     | Facets sit next to options in `when` until a component migrates. The contract bead is filed when the expand starts.                                                                                                                                                                              |
| 10 Garth decides meaning           | Facet meaning and transitions are `meaning` decisions; vectors encode them. Per-component `needs-decision` beads, as for anatomy.                                                                                                                                                                |
| 12 Consolidate                     | Net terms must fall: `accessibility` goes away, and `kind` and the cross-check from 021 shrink to what the contract needs.                                                                                                                                                                       |
| 14 No shims                        | `accessibility` is deleted after migration, not kept beside the contract. Names from other implementations stay aliases or implementation-row maps, never valid names in data.                                                                                                                   |
| 16 Parts                           | Every part a contract names is an anatomy part. A hidden implementation element (ui-sdk's hidden `input`) is not a part and stays out.                                                                                                                                                           |

**One correction to the earlier discussion.** I suggested the contract could absorb the interaction half of `states`. It cannot: state names appear in token name objects (`state: hover`), which is part of the `@adobe/spectrum-tokens` surface. `states` stays for token identity and for appearance precedence. What changes is the direction: the state names a recipe resolves against are derived from facets by a small registry mapping (`hovered` to `hover`, `pressed` to `down`, `focusVisible` to `keyboard-focus`), so nobody maintains the same list twice.

## The file

```text
behaviors/<component>.json
  component        the component id
  extends          optional shared base contracts ("interactive")
  state            option ids this contract owns (kind: state, proposal 021)
  facets           what the appearance layer may read, each derived from state
  parts            per anatomy part: role, focus, press
  transitions      intent, guard, action
  semantics        facet to accessibility state/trait, per part
  vectors          conformance tests
```

### Intents (events)

A transition is triggered by an **intent**, never a DOM event. Each platform maps a gesture to an intent: Space or Enter on web, a tap on touch, a VoiceOver double tap on iOS. Starting vocabulary, reusing today's names where they exist:

| Intent                                                                  | Meaning                                                                                                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `focus` (`via`: `keyboard`, `pointer`, `programmatic`)                  | The part receives focus. `via` decides `focusVisible`.                                                                          |
| `blur`                                                                  | Focus leaves.                                                                                                                   |
| `press-start`, `press-end`, `press-cancel`                              | A press begins, completes on the part, or ends elsewhere.                                                                       |
| `activate`                                                              | The primary action, after a completed press or a keyboard or assistive-technology activation.                                   |
| `pointer-enter`, `pointer-leave`                                        | Only on platforms with a pointer.                                                                                               |
| `navigate-next`, `navigate-previous`, `navigate-first`, `navigate-last` | Logical movement among peers. The platform maps arrows and flips them for right-to-left, so a contract never says `ArrowRight`. |

### Capabilities

A transition or vector may require a capability: `pointer-hover`, `keyboard`, `assistive-activation`. An implementation on a platform without it (iOS has no hover) neither runs nor fails those vectors, and its facet (`hovered`) never becomes true. This is what keeps one contract honest on touch platforms.

### Facets

A facet is a named, finite-valued view of state. It comes from one of two places:

* **State groups** (proposal 021): `checked: unchecked | checked | indeterminate`, from `isSelected` and `isIndeterminate`; `disabled: false | true`, from `isDisabled`.
* **Interaction facets** from the shared `interactive` base: `hovered` (needs `pointer-hover`), `pressed`, `focusVisible` (needs `keyboard`).

The registry `registry/facets.json` lists the ids and values, so a recipe can be validated against it.

## Worked example: Switch

```json
{
  "component": "switch",
  "extends": ["interactive"],
  "state": ["isSelected", "isDisabled", "isReadOnly"],
  "facets": {
    "checked": { "from": "isSelected", "values": { "unchecked": false, "checked": true } },
    "disabled": { "from": "isDisabled", "values": { "false": false, "true": true } },
    "readOnly": { "from": "isReadOnly", "values": { "false": false, "true": true } }
  },
  "parts": {
    "track": { "role": "switch", "focus": "tab-stop", "press": "activate" }
  },
  "transitions": [
    {
      "on": "activate",
      "guard": { "all": [{ "facet": "disabled", "is": "false" }, { "facet": "readOnly", "is": "false" }] },
      "do": { "toggle": "isSelected" },
      "emit": "change"
    }
  ],
  "semantics": {
    "track": { "checked": { "ariaState": "aria-checked", "map": { "unchecked": "false", "checked": "true" } } }
  }
}
```

`isSelected` is not redeclared: `state` lists option ids, and the option stays the source (principle 1). `readOnly` keeps focus and announces its state but ignores `activate`, which is the difference from `disabled`.

## Worked example: Checkbox

```json
{
  "component": "checkbox",
  "extends": ["interactive"],
  "state": ["isSelected", "isIndeterminate", "isDisabled"],
  "facets": {
    "checked": {
      "from": ["isSelected", "isIndeterminate"],
      "values": {
        "indeterminate": { "isIndeterminate": true },
        "checked": { "isIndeterminate": false, "isSelected": true },
        "unchecked": { "isIndeterminate": false, "isSelected": false }
      },
      "order": "first match wins"
    }
  },
  "parts": { "box": { "role": "checkbox", "focus": "tab-stop", "press": "activate" } },
  "transitions": [
    {
      "on": "activate",
      "guard": { "facet": "disabled", "is": "false" },
      "do": { "set": { "isIndeterminate": false, "isSelected": { "not": { "facet": "checked", "is": "checked" } } } },
      "emit": "change"
    }
  ],
  "semantics": {
    "box": { "checked": { "ariaState": "aria-checked", "map": { "unchecked": "false", "checked": "true", "indeterminate": "mixed" } } }
  }
}
```

The two booleans stay the API, as decided for proposal 021. The facet encodes "indeterminate overrides selection" once, in order, so an implementation or an exporter reads one value. The transition says an activation from indeterminate checks the box: `checked` is not `checked`, so `isSelected` becomes true and `isIndeterminate` false.

## Radio button and action button

* **Radio button** needs its group. The `radio-group` contract adds `navigate-next` and `navigate-previous` with wrap, and moves selection with focus. Roving focus is declared (`focus: "roving"`), so only the selected or first radio is a tab stop. This is the first place a group enters; whether groups count as collections (proposal 016) is open question 5.
* **Action button** is the simple `button` role plus the optional selected case: `activate` fires `press` always, and toggles `isSelected` only when the button is a toggle. The data has no separate toggle-button component today, so this slice covers `action-button` with `isSelected`.

## Conformance vectors

Vectors live next to the contract and run from `packages/design-data-spec/conformance/behavior/` (the directory already hosts the valid, invalid and resolution suites). A vector is a start state, a list of intents, and expected facets and emitted events after each step:

```json
{
  "component": "checkbox",
  "name": "space on an indeterminate checkbox checks it",
  "needs": ["keyboard"],
  "start": { "isSelected": false, "isIndeterminate": true },
  "steps": [
    { "intent": "focus", "via": "keyboard" },
    { "intent": "activate" }
  ],
  "expect": [
    { "after": 1, "facets": { "focusVisible": true, "checked": "indeterminate" } },
    { "after": 2, "facets": { "checked": "checked" }, "emit": [{ "change": { "isSelected": true, "isIndeterminate": false } }] }
  ]
}
```

and a negative one:

```json
{
  "component": "switch",
  "name": "disabled ignores activation",
  "start": { "isSelected": false, "isDisabled": true },
  "steps": [{ "intent": "activate" }],
  "expect": [{ "after": 1, "facets": { "checked": "unchecked" }, "emit": [] }]
}
```

**Running them.** An implementation provides a small adapter: set the start options, map each intent to a real event (dispatch a key event, call the native method, send an accessibility action), then read the facets back from its own state attributes. The SDK ships a reference runner for the data model itself. Each implementation reports pass, fail or not applicable (missing capability). A failure is either a bug in the implementation or in the contract; deciding which is a `meaning` call.

## Appearance interface

A recipe's `when` may reference only facets (and size and appearance options). Today a Switch recipe reads `isSelected`, `isDisabled` and the interaction states; after migration it reads `checked`, `disabled`, `hovered`, `pressed`, `focusVisible`. The renderer resolves facets from options plus the requested interaction states, so a render is unchanged. Neutrality is proved the usual way: byte-identical recipe snapshots (`recipe-snapshots.json`) before and after, per component.

## Comparison

|                     | This proposal                                                | ui-sdk `definePrimitive`                                       | React Aria                                        | SCXML                    |
| ------------------- | ------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------- | ------------------------ |
| Form                | Data (JSON), declarative                                     | TypeScript code                                                | TypeScript code (state hooks)                     | XML statechart           |
| State vs appearance | Options marked `kind: state`, facets published to appearance | State rendered by each slot's `attrs`; styling is the author's | State exposed as render props and data attributes | Not addressed            |
| Role, focus, keys   | `parts`: role, focus model, press; intents instead of keys   | `role` forces `focus`, `press`, `keys` to be declared, typed   | Hooks implement the ARIA pattern per component    | Not addressed            |
| Executable          | Reference runner for vectors; not an implementation          | Yes, it is the implementation                                  | Yes                                               | Yes, with an engine      |
| Conformance tests   | Vectors are the point                                        | Library tests, not exposed as data                             | Library tests                                     | None built in            |
| Platform neutral    | Yes, intents and capabilities                                | Five JS frameworks                                             | React (hooks also used by others)                 | Yes, but no UI semantics |

React Aria and ui-sdk are what a web implementation would use to satisfy the contract; they are not competitors. SCXML is the closest model for transitions, and a statechart form is the fallback if a transition table cannot express a component (open question 3). I read ui-sdk's published docs for `definePrimitive`; the React Aria row is from memory of its docs and should be checked before this leaves draft.

## What changes, what stays

* **Added:** `behaviors/` and its schema, `registry/facets.json`, an intent registry, the reference runner, `conformance/behavior/` suites.
* **Replaced (if open question 1 says replace):** the `accessibility` block, migrated into `parts` and `semantics`, then removed (principle 14). `intents` and `keyboardIntents` become the intent registry. Proposal 021's `accessibility` cross-check is dropped, since there is one copy.
* **Stays:** `options` (with `kind`), `states` (token identity and precedence), anatomy, relationships, recipes (reading facets), the implementation row's `parts` and state-attribute maps from 021, which are generation inputs.
* **Measured today:** 33 of 97 components declare a `role`, so that is the first migration set. The first slice is five components.

## Not in this slice

Popups and overlays, collections and lists, text input and IME, drag and drop, long press and other gestures, animation timing, internationalized key maps beyond right-to-left reversal. Each needs its own intents and probably a statechart.

## Vector spike results (2026-11-24)

The vectors in this proposal were written as plain JSON with a small Playwright runner, and run in headless Chrome against a native-input baseline, `@ui-sdk/react` 0.1.0-beta.16, React Spectrum S2 1.8.2 (`@react-spectrum/s2`) and Spectrum Web Components. SWC gen 2 has no Switch or Checkbox, so Switch and Checkbox ran on gen 1 (Spectrum 1) 1.12.6; radio group and action button ran on both generations. The scripts live outside the repository (bead `spectrum-design-data-9fe.13` notes). An adapter is a small page per library; the runner reads facets from the DOM (role, `aria-checked`, `:focus-visible`) and emitted changes from a log, so it does not depend on a library's internals.

| Set                           | Vectors | Native input | ui-sdk | React Spectrum S2 | SWC gen 1 | SWC gen 2    |
| ----------------------------- | ------- | ------------ | ------ | ----------------- | --------- | ------------ |
| Switch and Checkbox           | 26      | 26           | 26     | 24                | 24        | no component |
| Radio group and action button | 20      | 20           | 20     | 20                | 18        | 17           |

**Divergences found**

* **React Spectrum S2, Checkbox:** `isIndeterminate` is a plain prop. A click or Space checks the box, but the indeterminate state stays set until the app clears it, so the checkbox keeps reading as indeterminate. The vectors expect activation to clear it (native input behavior, ui-sdk). Whether S2 or the contract is right is a `meaning` call.
* **SWC gen 1, Switch and Checkbox:** read-only is a natively disabled input. It is not focusable and exposes no `aria-readonly`, so the vector "read-only keeps focus" fails.
* **Enter, all implementations:** none of the four toggles on Enter. The design data's switch and checkbox guideline blocks say "Space or Enter toggles". Recorded as bead `spectrum-design-data-qkj5.398`.
* **SWC gen 2:** no Switch, Checkbox or selectable action button (`toggles` and `selected` moved to a toggle button that is "coming soon"). Its radio group passes all 12 vectors.

**A change to the contract the radio vectors forced.** Arrow keys mirror in right-to-left layouts only when the group is horizontal. React Spectrum S2 and SWC gen 1 default to a vertical group, where Left and Right do not swap, so the first RTL vectors failed on both until the group was made horizontal (S2: fixed and passes 20/20; SWC gen 1 not rerun, 18/20). A radio-group contract therefore needs an `orientation` start property, and the RTL vectors apply only to horizontal groups.

**What the spike says about the cost.** Of 46 vectors on five targets there were two library divergences and one data-versus-implementation conflict, all on Switch and Checkbox, and none on radio group or action button. Vectors found assumptions and coverage gaps more than bugs. That suggests a use beyond pass or fail: a coverage report per implementation (which components and behaviors exist, which vectors apply, which pass), generated from the same vectors, so a team can see where its implementation has no equivalent. I have not built that report.

## Open questions

1. ~~**Replace or sit beside?**~~ **Decided 2026-11-24 (owner): replace.** The contract replaces `accessibility`, and proposal 021's `accessibility` cross-check is dropped. Replacing follows principles 1, 12 and 14.
2. **Contract per pattern or per component?** A "toggle" pattern shared by switch, checkbox, radio and a chip toggle would let an agent that builds a new component pick a pattern and get its vectors. Do patterns live in `behaviors/patterns/` and components `extends` them?
3. **Table or statechart?** Is a guarded transition table enough for the first slice, with a statechart form kept for components that need hierarchy or history?
4. **Facet vocabulary.** `checked` against `selected`, `pressed` against `down`: should facets reuse today's state names, or be a separate set mapped to them?
5. **Groups.** Is a radio group a collection (proposal 016) or a pattern of its own?
6. **Who owns the vectors?** The data team, per component, with Design reviewing meaning, or the implementing teams contributing as they find gaps? Evidence: the divergences above are meaning calls (S2 indeterminate, SWC read-only, Enter), so the data team can write vectors but the owner and Design have to decide who is right; implementing teams cannot settle them alone.
7. **Where do vectors run?** In this repo's CI against the reference runner only, or also against implementations that opt in? Evidence: adapters are small (one page per library) and run in headless Chrome in about a minute per library; the work is writing and maintaining the adapters, not running them. Running them in this repository against implementations we do not own would need pinned versions.
8. **Capability list.** Is `pointer-hover`, `keyboard`, `assistive-activation` the right starting set?

## Evidence and risks

* The ui-sdk spikes (branches `spike/ui-sdk-switch`, `spike/ui-sdk-checkbox`, `spike/ui-sdk-frameworks`) show state, attributes and part names can be generated from data once they are declared; they say nothing about transitions.
* The agent probes (bead `spectrum-design-data-9fe.14`) did not find behavior to be what blocked agents: ui-sdk supplied it every time. The value of the contract is conformance checking, as the vector spike above shows, not agent context.
* Cost: a new file type and vocabulary, migration of 33 components, and vectors to maintain against behavior we do not own. The gain is a conformance check that does not exist today.
