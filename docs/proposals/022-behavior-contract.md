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
  extends          optional shared base contracts: files in behaviors/patterns/ ("interactive")
  state            option ids this contract owns (kind: state, proposal 021)
  facets           what the appearance layer may read, each derived from state
  parts            per anatomy part: role, focus, press, handles
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

A part's `handles` lists the intents it handles that change no state (`navigate-items`, `increment`, `decrement`, `select-all`): keyboard behavior that has no transition because no option changes. An intent that changes state is a transition. A shared base contract is a file in `behaviors/patterns/` (decided 2026-11-24: patterns are data, not hard-wired); a contract reads an interaction facet only when a pattern it extends publishes it. The pattern also carries the transitions that move those facets (decided 2026-11-24, A511): the same `{on, guard, do}` rows as a contract, with an optional `via` on the event (`{ "on": "focus", "via": "keyboard", "needs": ["keyboard"], "do": { "set": { "focusVisible": true } } }`) and `do.raise: "press"` to fire the part's `press` intent. `press-end` is guarded on `pressed`, so a press that never started (or was cancelled) raises no `press`. A runner or adapter reads these rows instead of coding them. A facet may list `blocksInteraction`, the event intents that do nothing while it is `true` (`disabled` blocks `focus`, `press-start` and `pointer-enter`), so a disabled control takes no focus. The role of a component is carried by its root or primary part, chosen per component, and contracts keep ARIA names (`aria-checked`); other platforms map them through adapters. A `wcag` list on the contract, a facet or a part carries the criteria the `accessibility` block carries today.

## Worked example: Switch

```json
{
  "component": "switch",
  "extends": ["interactive"],
  "state": ["isSelected", "isDisabled", "isReadOnly"],
  "facets": {
    "checked": {
      "from": "isSelected",
      "values": { "unchecked": false, "checked": true }
    },
    "disabled": {
      "from": "isDisabled",
      "values": { "false": false, "true": true }
    },
    "readOnly": {
      "from": "isReadOnly",
      "values": { "false": false, "true": true }
    }
  },
  "parts": {
    "track": { "role": "switch", "focus": "tab-stop", "press": "activate" }
  },
  "transitions": [
    {
      "on": "activate",
      "guard": {
        "all": [
          { "facet": "disabled", "is": "false" },
          { "facet": "readOnly", "is": "false" }
        ]
      },
      "do": { "toggle": "isSelected" },
      "emit": "change"
    }
  ],
  "semantics": {
    "track": {
      "checked": {
        "ariaState": "aria-checked",
        "map": { "unchecked": "false", "checked": "true" }
      }
    }
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
  "parts": {
    "box": { "role": "checkbox", "focus": "tab-stop", "press": "activate" }
  },
  "transitions": [
    {
      "on": "activate",
      "guard": { "facet": "disabled", "is": "false" },
      "do": {
        "set": {
          "isIndeterminate": false,
          "isSelected": { "not": { "facet": "checked", "is": "checked" } }
        }
      },
      "emit": "change"
    }
  ],
  "semantics": {
    "box": {
      "checked": {
        "ariaState": "aria-checked",
        "map": {
          "unchecked": "false",
          "checked": "true",
          "indeterminate": "mixed"
        }
      }
    }
  }
}
```

The two booleans stay the API, as decided for proposal 021. The facet encodes "indeterminate overrides selection" once, in order, so an implementation or an exporter reads one value. The transition says an activation from indeterminate checks the box: `checked` is not `checked`, so `isSelected` becomes true and `isIndeterminate` false.

## Radio button and action button

* **Radio button** needs its group. As built (spec page, "Radio button and radio group"): the radio contract's `navigate-next` and `navigate-previous` select the radio the arrow lands on (selection follows focus) and the adapter routes the intent to the peer the arrow lands on, wrapping and skipping a disabled one (A548; A540 is met for select-on-move only); roving focus is declared (`focus: "roving"`), so only the selected or first radio is a tab stop. The radio-group contract carries `orientation`, the environment property `direction` (registered in `registry/environment.json`, A551) and the `arrowOrder` facet that says when Left and Right swap. The group's selected value and peer traversal as data are open (a flat state table cannot name "the next enabled peer"). This is the first place a group enters; whether groups count as collections (proposal 016) is open question 5.
* **Action button** is the simple `button` role plus the selected case (A550, as built): `activate` toggles `isSelected`, emits `press` with the new value, and the part exposes it as `aria-pressed` (facet `selected`); `isPending` blocks press (facet `pending`, a first `activate` transition that does nothing); `hasHoldIcon` stays out of the contract. **Button** and **Close button** extend `press` with no overrides beyond that: Button adds the same `pending` rule for its `isPending`, Close button has only `isDisabled`. `in-field-progress-button` was removed from the data (A2-2, [#1971](https://github.com/adobe/spectrum-design-data/issues/1971)), so it has no contract. **Link** extends `interactive` with its own `activate` that raises `press` (the link declares no `isDisabled`), role `link`, bound by the web `link` role (Enter on key down, Space unbound). **In-field button** extends `press` (`isDisabled`). **Clear button** (a subcomponent) extends `press` (`isDisabled`), the same shape as Close button; the subcomponent flag affects no contract rule. **Floating action button** extends `press` and lists `isDisabled` although its data declares no such option, so SPEC-118 warns once (decision A559: keep as built, the warning is accepted; link on `press` would also pass its vectors, `interactive` only avoids the warning). Decisions A555 (Button's `isPending` blocks press) and A556 (Action button always toggles `isSelected`) are as built. Expected `emit` stays exact; a vector may set `emitOptions: "listed"`, which the shared `button` role key vectors use so `{ press: {} }` still holds for a press that also toggles.

## Conformance vectors

Vectors live next to the contract and run from `packages/design-data-spec/conformance/behavior/` (the directory already hosts the valid, invalid and resolution suites). A vector is a start state, a list of intents, and expected facets and emitted events after each step:

```json
{
  "component": "checkbox",
  "name": "space on an indeterminate checkbox checks it",
  "needs": ["keyboard"],
  "start": { "isSelected": false, "isIndeterminate": true },
  "steps": [{ "intent": "focus", "via": "keyboard" }, { "intent": "activate" }],
  "expect": [
    {
      "after": 1,
      "facets": { "focusVisible": true, "checked": "indeterminate" }
    },
    {
      "after": 2,
      "facets": { "checked": "checked" },
      "emit": [{ "change": { "isSelected": true, "isIndeterminate": false } }]
    }
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

**Display components (phase 3, PR 1).** Progress bar, Progress circle, In-field progress circle and Meter take no input, so their contracts have no `extends` and no transitions: a part with its role (`progressbar`, `meter`) and `focus: none`, `wcag` from the block, and `semantics` entries keyed by option with `copy: true` that expose `value`, `minValue` and `maxValue` as `aria-valuenow`, `aria-valuemin` and `aria-valuemax`, absent while `isIndeterminate` (`absentWhen`). Vectors gain an `aria` expectation to assert them. No `display` pattern: parts differ per component and nothing but `wcag` would be shared. `valueLabel` is copied to `aria-valuetext` on Progress bar and Meter (A578); `label` is copied to `aria-label` (A581; labelledby when semantics can reference a part).

**Groups (phase 3, PR 2).** Button group, Swatch group, Checkbox group and Avatar group get a contract for the group only: `container` with `focus: none` and the declared role (Checkbox group declares none, so none is carried), the `orientation` and `disabled` facets where the options exist, and a vector that a keyboard focus, press, pointer-enter and blur sequence raises nothing on the group (it checks the container has no transitions of its own). No `group` pattern. Open as needs-decision beads: Checkbox group's missing role (hd0g.4.8), arrow-key navigation that the component prose declares but the blocks do not (hd0g.4.9), `isDisabled` reaching the items (hd0g.4.10), how Swatch group selection moves (hd0g.4.11) and `aria-orientation` on role `group` (hd0g.4.12).

**Pins (A575).** The phase 2 review found that mutating a part's `focus`, dropping `isDisabled` from `state` or mistyping a part's `role` left a suite at 17 of 17 (a mistyped role only dropped the shared key vectors, 17 to 12). A vector cannot see these, so a component suite carries `pins` (the `state` list, `wcag` and each part's `role`, `focus`, `press`, `handles`) and the runner fails the contract when it differs; it also fails a facet or transition that uses an option `state` does not list, and an `input` step or key suite for a role the bindings lack. The pins repeat the contract on purpose: they are the independent second statement that a vector cannot be.

## Per-platform key bindings

**Status:** decided (A517 to A521, 2026-11-24): shape B, below, is implemented. Decision A512 (Garth, 2026-11-24): the behavior contracts must be able to express which keys act on a component per platform (Space versus Enter on a switch or checkbox, bead `qkj5.398`, a source conflict). Before this section a contract named intents only and a vector said nothing about keys, so no key-level vector existed. This is a format change beyond what is merged, and it pulls against principle 12 above (intents stay platform-agnostic; keys are per-platform bindings). The shapes below keep the intent layer intact and differ only in where the key facts live.

### Recommendation

**Shape B: bindings keyed by role, in a per-platform bindings file; key vectors are ordinary conformance vectors with an `input` step.** The contract files for Switch and Checkbox do not change. Reasons:

* Keys vary by **role**, not by component: switch and checkbox share "Space activates, Enter does not"; button is "Enter and Space"; link is "Enter". Roles are already in the contract (`parts.<part>.role`). One binding per role (about 20 roles in use) beats repeating the same map in 33 contracts, and cannot drift per component (principle 1).
* The contract stays platform-agnostic (principle 12) and a new platform adds one file, not an edit to every contract.
* It honors A512 in effect: a key-level vector exists per platform and fails if the key mapping is wrong. It departs from the most literal reading ("the contract names keys"), which is Shape A. If Garth wants the keys visible in each contract file, take A.

### Evidence: what implementations do

| Role              | Space                                                                                                    | Enter                                                                     | Source                                                                                                                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| switch / checkbox | toggles (on key up)                                                                                      | does **not** toggle                                                       | Vector spike: native input, React Spectrum S2 1.8.2, `@ui-sdk/react` 0.1.0-beta.16, SWC gen 1 1.12.6 all pass "Enter does not toggle". Measured.                                                                                           |
| button            | activates on key up (S2: `onPressStart` on key down, `onPressEnd` and `onPress` on key up; no DOM click) | activates on key down (the click; S2 fires `onPress` on key up)           | Measured (Chrome 158): native `<button>`, React Spectrum S2 1.8.2, SWC gen 1 1.12.6. Enter held repeats the click; Space held does nothing.                                                                                                |
| link              | does not activate                                                                                        | activates on key down (click and navigation; S2 `onPress` on key up)      | Measured: native `<a href>`, S2 `Link`, SWC gen 1 `sp-link`. Enter held does **not** repeat the click.                                                                                                                                     |
| radio             | selects the focused radio on key up; nothing when it is already selected                                 | does nothing (native submits a form: browser behavior, not the component) | Measured: native, S2, SWC gen 1. Arrows move to the next enabled radio and select it on key down, wrap, skip a disabled radio and repeat while held. Home and End do nothing in native and S2; SWC gen 1 moves to the first or last radio. |

**Spike corrections (2026-11-24, Chrome 158).** The button, link and radio rows above were first written from documentation and are now measured. Corrections: React Spectrum S2 fires no DOM click for Space on a button (only its press callbacks, on key up); Space on a link does nothing; radio Space selects on key up. Radio arrow keys select the radio they land on in all three implementations, so selection follows focus. Right-to-left mirroring of Left and Right differs: native mirrors always (even a vertical group), S2 and SWC gen 1 only for a horizontal group, S2 reading the locale (a `dir` attribute alone did nothing) and SWC the `dir` attribute. Up and Down never change. Key repeat is not a phase (A521, A541): only button Enter repeats the click; link Enter and every Space activation do not; arrows on a radio repeat move and select. Decided from it: A538 button and link Enter bind `down: [press-start, press-end]`; A539 radio has no Home or End binding; A540 select-on-move lives in the radio contract's `navigate-*` transitions; A542 the group's `arrowOrder` facet (`mirrored` only for a horizontal group in a right-to-left direction) is the mirroring rule.

Two facts matter for the format: the **event timing differs** (Space fires on key up, Enter on key down for a button), and the same physical key means different things per role. The existing press model already has the pieces (`press-start`, `press-end`, `press`, `activate`), so a binding maps a key and phase to those event intents rather than straight to `activate`.

### Shape A: keys inside the contract, per platform

The contract carries a `bindings` map, per part, keyed by platform id.

```json
"parts": {
  "track": {
    "role": "switch", "focus": "tab-stop", "press": "activate",
    "bindings": {
      "web":     { "keyboard": { "Space": "activate" } },
      "ios":     { "touch": { "tap": "activate" } },
      "android": { "touch": { "tap": "activate" } }
    }
  }
}
```

A vector step gains `key` (and the platform it runs on):

```json
{ "name": "Enter does not toggle", "needs": ["keyboard"], "platform": "web",
  "start": { "isSelected": false },
  "steps": [{ "intent": "focus", "via": "keyboard" }, { "key": "Enter" }],
  "expect": [{ "after": 2, "facets": { "checked": "unchecked" }, "emit": [] }] }
```

* **No keyboard (iOS touch):** the `ios` entry has no `keyboard` key, and key vectors are `needs: ["keyboard"]`, so they are not applicable.
* **Runner:** resolves the `key` step through the part's `bindings[platform]` to an intent, then runs the existing transition code. `--platform web` selects the map.
* **Schema:** `parts.<part>.bindings` (platform id to input kind to key to intent), step `oneOf` `intent` or `key`, a key-name registry. SPEC-119 resolves intents; a new warning for a binding naming an unregistered platform or key.
* **Cost:** the Space-only fact is copied into Switch, Checkbox, and every future toggle (principle 1 pressure). Every new platform edits every contract. Contracts stop being platform-agnostic, which is the cost principle 12 warns about. Benefit: everything about a component is in one file; this is the literal reading of A512.

### Shape B: a bindings file per platform, keyed by role (recommended)

Bindings live outside the contract, next to the platform that owns them. Incubating location: `platforms/<id>/extensions/behavior-bindings/<platform>.json` (the manifest extension tree already holds platform-local data); a team that extracts its manifest repo takes the file with it. Foundation-level `web` bindings, which every web implementation shares, could instead sit in `packages/design-data/behaviors/bindings/web.json`; decided: A518, see Decided below.

```json
{
  "$schema": ".../behavior-bindings.schema.json",
  "platform": "web",
  "capabilities": ["keyboard", "pointer-hover", "assistive-activation"],
  "roles": {
    "switch":   { "keyboard": [{ "key": "Space", "down": "press-start", "up": "press-end" }] },
    "checkbox": { "keyboard": [{ "key": "Space", "down": "press-start", "up": "press-end" }] },
    "button":   { "keyboard": [
      { "key": "Enter", "down": ["press-start", "press-end"] },
      { "key": "Space", "down": "press-start", "up": "press-end" }
    ] },
    "link":     { "keyboard": [{ "key": "Enter", "down": ["press-start", "press-end"] }] }
  }
}
```

An `ios` file has `"capabilities": ["assistive-activation"]` and `"roles": { "switch": { "touch": [{ "gesture": "tap", "down": "press-start", "up": "press-end" }], "assistive": [{ "action": "activate", "down": "activate" }] } }`: no keyboard entries, so keyboard vectors are not applicable. A platform with no keyboard at all simply omits `keyboard` from `capabilities`.

Key vectors are contract-shaped conformance files, one per platform and role, not one per component, so Switch and Checkbox reuse them:

```json
{ "platform": "web", "role": "switch",
  "vectors": [
    { "name": "Space toggles", "needs": ["keyboard"],
      "steps": [{ "intent": "focus", "via": "keyboard" },
                { "input": { "key": "Space", "phase": "down" } },
                { "input": { "key": "Space", "phase": "up" } }],
      "expect": [{ "after": 3, "emit": [{ "change": { "isSelected": true } }] }] },
    { "name": "Enter does not toggle", "needs": ["keyboard"],
      "steps": [{ "intent": "focus", "via": "keyboard" },
                { "input": { "key": "Enter", "phase": "down" } },
                { "input": { "key": "Enter", "phase": "up" } }],
      "expect": [{ "after": 3, "emit": [] }] }
  ] }
```

Placed at `conformance/behavior/bindings/web/switch.json`, applied to every component whose role-carrying part has that role.

* **Runner:** `design-data behavior test --platform web`. For an `input` step it looks up the focused part's `role` in the platform file, turns (key, phase) into the event intents, and feeds them to the existing path. If no binding matches the key, the step produces no intent, which is how "Enter does not toggle" passes. Existing intent vectors run unchanged and unchanged contracts keep working.
* **Schema:** one new schema `behavior-bindings.schema.json` (platform, capabilities, roles to input kinds to entries); the vector `steps` `oneOf` gains `input`; key names are a small registry (`Space`, `Enter`, `Escape`, arrows, `Home`, `End`, `PageUp`, `PageDown`, `Tab`) aligned with the existing `navigate-*` intents; two warnings (binding names an unregistered key or intent; a platform's role has no binding but a vector needs one).
* **Cost:** one new file type and one new vector step kind; the contract does not grow. The runner gains a lookup. Roles must be fine-grained enough that a binding is unambiguous; a component whose key behavior is not role-determined (a button that is Enter-only) needs a role override, which is the escape hatch to Shape A.

### Shape C: abstract key classes in the contract, physical keys in the platform file

The contract names a **gesture class** (`toggle`, `press`, `follow`), a registry entry; the platform file maps each class to physical input. Switch: `"press": "activate", "gesture": "toggle"`; the `web` file says `toggle` is Space, `press` is Enter and Space, `follow` is Enter.

* **Pros:** each contract states its keyboard intent without naming a key, and the web mapping is one table; a reader of one contract sees "toggle, not press".
* **Cons:** a second vocabulary (gesture classes) next to roles and intents (principle 4); the class is almost a restatement of the role; a registry nobody else uses. Roughly the cost of B plus a contract field and a registry. I would not pick it unless B's role granularity proves too coarse.

### Comparison

|                                            | A: in contract               | B: bindings file by role   | C: class in contract                     |
| ------------------------------------------ | ---------------------------- | -------------------------- | ---------------------------------------- |
| Switch/Checkbox contract file              | gains `bindings`             | unchanged                  | gains `gesture`                          |
| Where "Space only" lives                   | each contract, each platform | once per platform and role | once per platform and class              |
| New platform                               | edits every contract         | one new file               | one new file                             |
| Principle 12 (platform-agnostic intents)   | strained                     | kept                       | kept                                     |
| New schema                                 | field on parts               | new schema plus step kind  | field plus registry plus platform schema |
| Key vector expresses "Space yes, Enter no" | per component, per platform  | per role, per platform     | per class, per platform                  |
| Literal reading of A512                    | yes                          | no, same effect            | partly                                   |

### Risks

* **Timing and holding.** Space on key up versus Enter on key down, and key repeat (holding Enter on a button fires repeatedly), are not captured by a (key, phase) entry. Starting vocabulary covers down and up only; repeat is out of scope (add when a component needs it).
* **Role granularity.** Browsers differ on edge cases (a `role="button"` span versus `<button>`, Space on a radio). The bindings describe the **Spectrum-intended** behavior per role, sourced from React Spectrum S2 and verified by vectors, not the browser's.
* **The conflict bead stays a meaning call.** A binding of `Space` only for switch and checkbox encodes the recommendation in `qkj5.398`. Garth decided it (A520) and the guideline text now says Space.
* **iOS and Android entries are unverified.** I did not check hardware-keyboard behavior (Full Keyboard Access on iOS) or Android TalkBack; those entries stay empty until an owner supplies them.
* **Right-to-left and arrow keys.** Arrow flipping belongs to the `navigate-*` intents; bindings map physical arrows to `navigate-*` and the platform flips them, so a binding never encodes RTL.

### What would change the answer

* The owner wants every key visible beside its component in one file (reviewers read one contract): choose A.
* More than a few components need key behavior that is not determined by role: choose A for those or C.
* A platform owner wants to ship its mapping without touching foundation data: reinforces B (platform manifest location).
* Fewer than about 10 roles ever need distinct keys, and only web needs bindings: A is then cheap and B is more structure than needed.

### Decided

Garth decided shape B and its open points (2026-11-24):

* **A517:** a bindings file per platform, keyed by role (shape B).
* **A518:** the files live in `packages/design-data/behaviors/bindings/<platform>.json`, `web` now; a platform extensions folder later, when a platform team owns one.
* **A519:** key vectors are per platform and role; per component only for overrides.
* **A520:** Space alone toggles a switch and a checkbox on web; Enter does not. The Switch and Checkbox guideline text, which said "Space or Enter", now says Space.
* **A521:** the timing vocabulary is `down` and `up` only; there is no `repeat`.
* **A538:** button and link Enter bind `down: [press-start, press-end]`; **A539:** radio has no Home or End binding; **A540:** radio select-on-move lives in the radio contract's `navigate-*` transitions; **A541:** key repeat stays unmodelled and the measured behavior is in the table above; **A542:** right-to-left arrow mirroring is the group's `arrowOrder` facet, from `orientation` and `direction`.

The slice that implements it adds `behavior-bindings.schema.json`, `bindings/web.json` with only the verified entries (switch and checkbox), the `input` vector step, `design-data behavior test --platform`, SPEC-124 and the Switch and Checkbox key vectors. Button, link and radio entries, and every other platform, stay empty until verified; the spec page ("Key bindings") states what is enforced.

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
* **Enter, all implementations:** none of the four toggles on Enter. The design data's switch and checkbox guideline blocks say "Space or Enter toggles". Recorded as bead `spectrum-design-data-qkj5.398`; decided as Space only (A520) and the guideline text fixed.
* **SWC gen 2:** no Switch, Checkbox or selectable action button (`toggles` and `selected` moved to a toggle button that is "coming soon"). Its radio group passes all 12 vectors.

**A change to the contract the radio vectors forced.** Arrow keys mirror in right-to-left layouts only when the group is horizontal. React Spectrum S2 and SWC gen 1 default to a vertical group, where Left and Right do not swap, so the first RTL vectors failed on both until the group was made horizontal (S2: fixed and passes 20/20; SWC gen 1 not rerun, 18/20). A radio-group contract therefore needs an `orientation` start property, and the RTL vectors apply only to horizontal groups.

**What the spike says about the cost.** Of 46 vectors on five targets there were two library divergences and one data-versus-implementation conflict, all on Switch and Checkbox, and none on radio group or action button. Vectors found assumptions and coverage gaps more than bugs. That suggests a use beyond pass or fail: a coverage report per implementation (which components and behaviors exist, which vectors apply, which pass), generated from the same vectors, so a team can see where its implementation has no equivalent. I have not built that report.

## Open questions

1. ~~**Replace or sit beside?**~~ **Decided 2026-11-24 (owner): replace.** The contract replaces `accessibility`, and proposal 021's `accessibility` cross-check is dropped. Replacing follows principles 1, 12 and 14.
2. ~~**Contract per pattern or per component?**~~ **Decided 2026-11-24 (owner): patterns live in `behaviors/patterns/` and components `extends` them; none is hard-wired.** A "toggle" pattern shared by switch, checkbox, radio and a chip toggle would let an agent that builds a new component pick a pattern and get its vectors. Do patterns live in `behaviors/patterns/` and components `extends` them?
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
