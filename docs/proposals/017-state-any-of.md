<!-- Copyright 2026 Adobe. All rights reserved. -->

# Proposal 017: "Any of these" in relationship scope (states, and options)

**Status:** Draft. Nothing is built. Part A (states) was merged as a proposal; the addendum at the end (any-of across options) is new.\
**Affects:** `packages/design-data-spec/spec/relationship-format.md`, `spec/state-model.md` (resolution algorithm), `schemas/relationship.schema.json`, `sdk/core/src/visual.rs` (`scope_state_ids`, `resolve_candidates`), `validate/rules/spec054.rs`, 43 groups of relationship records in 6 components.\
**Beads:** `p6ga.21.5` (this proposal), `p6ga.21.12` (build), `p6ga.21.13` (checkbox, the addendum), `p6ga.21.8` (breadcrumbs), `p6ga.21.4` (redundancy lint that finds the cases). Epic `p6ga.21`.

## Problem

`scope.options.state` is an ordered array that means **all of**: `["selected", "hover"]` applies when both states are active (`state-model.md`, State names). An option array means **any of**: `variant: ["accent", "negative"]` matches either value (`relationship-format.md`). So when hover and down take the same token, the data needs one record per state.

A scan on 2026-11-14 found records that point at the same token and differ only in one state:

| Components                                                                            | Groups | Records that could go |
| ------------------------------------------------------------------------------------- | ------ | --------------------- |
| button, action-button, menu, stack-item, table, tree-view                             | 43     | 61                    |
| Breadcrumbs writes the same idea into a context string: `(hover, down, focus states)` | 1      | 1                     |

Typical case: `button` `Background` binds one token for `["hover"]` and the same token for `["down"]`, four times over (accent, negative, primary and secondary variants).

The duplicates are a maintenance cost. A token change has to be made in each copy, and nothing says the copies are meant to stay equal.

## Proposal

An element of the `state` array may be a state id (as today) or an object `{ "anyOf": [ids] }`.

```json
{ "scope": { "options": { "state": [{ "anyOf": ["hover", "down"] }] } } }
```

The array stays **all of**; an `anyOf` element is true when at least one of its members is active. The two compose, so the stack-item pair `["selected", "hover"]` and `["selected", "down"]` becomes:

```json
"state": ["selected", { "anyOf": ["hover", "down"] }]
```

A plain array of strings means exactly what it does now, so no existing record changes.

### Meaning

A record with `anyOf` elements is equivalent to one record per combination of members, all with the same `$ref`. Each expanded record's `state` is a **set**: a state that appears twice counts once. Implementations may evaluate the record directly or expand it, but must give the same answer as the expansion.

The rule for the resolution algorithm in `state-model.md` is therefore one sentence: **rank the record's candidate expansions by steps 4 and 5, and the record ranks as the best of them.** In terms of the steps:

1. **Candidate test (step 3).** An expanded record is a candidate when it has only active states. The record is a candidate when at least one expanded record is.
2. **Specificity (step 4).** Each candidate expansion matches its distinct states (the state list is a set). An `anyOf` element adds one state to each expansion, because each expansion picks one member, so the member count of a group never raises specificity.
3. **Precedence (step 5).** Among expansions tied on specificity, compare their matched `interaction` states as step 5 does today. `prop` states never contribute precedence. So `{ anyOf: ["selected", "hover"] }` with only `selected` active has the single candidate `["selected"]`, with an empty interaction list; with both active the candidates are `["selected"]` and `["hover"]`, and `["hover"]` wins. With hover (50) and down (70) both active, `{ anyOf: ["hover", "down"] }` ranks as the `["down"]` expansion (70).
4. **Ties (step 6).** Unchanged.

The record's rank is the rank of its best expansion; it is then compared with every other record's rank by the same steps. Specificity is never counted on an expansion chosen by a later step.

Members of one `anyOf` do not need to share a trigger type.

### Where it applies

Only `relationship.scope.options.state`. Token `name.state` stays atomic, because names are identity keys and a name that matches several states would stop being one.

### Validation

* **Layer 1** (`relationship.schema.json`): each `state` element is a string or `{ anyOf: [string, ...] }` with `minItems: 2` and `uniqueItems: true`. A one-member `anyOf` or a repeated member fails the schema; write the id directly.
* **SPEC-054** (`ctr-state-valid`) checks every member against the component's declared states, as it does for plain ids.
* **New warning:** a state that appears in more than one element of the same `state` array (`["down", { "anyOf": ["down", "hover"] }]`, or two groups sharing a member). The expansion is well defined, because it is a set, but it is almost always a mistake.
* **New lint** (redundancy lint, `p6ga.21.4`): records with the same `$ref` and scope whose `state` differs in one element **SHOULD** be one record with `anyOf`.

## What this does not add

* **`not`** ("every state except disabled"). The resolution algorithm already drops interaction states when `disabled` is active, and no record in the data needs it. Add it when one does.
* **`xor`.** There is no case.
* **Option arrays.** They already mean any-of and keep meaning it. The 31 records that pin an option subset and the 189 that pin every value are handled by that existing syntax (`p6ga.21.4`), not this proposal.

## Alternatives

| Option                                                   | Why not                                                                                                     |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `state: [["hover"], ["down"]]` (a list of all-of lists)  | Shorter, but a reader cannot tell it from a typo for `["hover", "down"]`. Explicit `anyOf` is easy to read. |
| A single combined state (`pressed` for hover or down)    | Hover and down are different states with different precedence; collapsing them loses the distinction.       |
| Keep one record per state                                | The status quo. It works, and is what the redundancy lint would otherwise keep flagging.                    |
| Mark a record as a copy of another with a `sameAs` field | A second source of truth for the same fact; the whole point is one record.                                  |

## Rollout

1. Spec text and schema (relationship-format.md, state-model.md), MINOR changeset on `@adobe/design-data-spec`.
2. Renderer: `scope_state_ids` and `resolve_candidates` read the new element; a test that a merged record renders identically to its expansion (use the button and action-button snapshots).
3. SPEC-054 and the redundancy lint.
4. Data: merge the 43 groups, component by component, with `recipe_snapshots` and `visual_goldens` unchanged. Then breadcrumbs (`p6ga.21.8`).

Consumers that read `scope.options.state` as an array of strings (the TUI, the query layer, the Figma export, the MCP) need a grep and a change in step 2. This proposal has not listed them; do that before step 2.

## Open questions

1. Should `anyOf` also be allowed with a single object instead of an array, `state: { "anyOf": [...] }`? That reads well for the common case but makes the field a union of two shapes. This draft keeps one shape, an array.
2. Mixed `prop` and `interaction` members in one `anyOf` are allowed by the expansion rule. Is that worth keeping, or should the schema require one trigger type per group? No record in the data mixes them today.

## Addendum: any-of across options (checkbox)

### Problem

Option pins are per option: `scope.options` is an object, its keys are ANDed, and an array value means any of that one option's values. There is no way to say "`isSelected` or `isIndeterminate`".

The checkbox needs it. An indeterminate checkbox is drawn like a selected one, and the checkbox recipe already fires its selected entries on `isSelected` OR `isIndeterminate` (see the `when` lists in `visuals/checkbox.json`). When the SPEC-093 migration pinned `isSelected: true` on the `Control (selected, …)` records, an indeterminate request (`isSelected: false`, `isIndeterminate: true`) matched none of them and the snapshots reported `no relationship 'background-color' / 'Control'`. The checkbox is the only component known to need it, and it holds 25 of the remaining SPEC-093 warnings (bead `p6ga.21.13`).

### Proposal

`scope.options` may carry a reserved key `anyOf`, an array of option-condition objects. Each object is an AND of pins in the same form as `scope.options` itself. The record applies when its other pins match **and** at least one alternative matches.

```json
{ "scope": { "options": { "isEmphasized": true, "anyOf": [{ "isSelected": true }, { "isIndeterminate": true }] } } }
```

reads: emphasized, and selected or indeterminate. Alternatives follow the shape of their container, so this and the state form stay parallel: states are an ordered all-of array whose elements may be `{ "anyOf": [...] }`, and options are an AND object that may hold an `anyOf` key.

**Meaning.** A record with `anyOf` is equivalent to one record per alternative, all with the same `$ref`: the base pins plus that alternative. This is the same expansion rule as the state form, so the resolution rule stays one sentence: **a record with `anyOf` ranks as its best-ranked candidate expansion** (steps 4 and 5 of `state-model.md` for states, and the option score below).

**Option score.** The solver scores a candidate by the number of its pins that match the request (an any-of array of values counts once) and drops it if one does not (`when_score` and `pinned_options` in `sdk/core/src/visual.rs`). The score of a record with `anyOf` is the score of its best matching expansion: the base pins plus the pin count of the best alternative that matches. For single-pin alternatives such as `isSelected: true` that is one point. The record is dropped when no alternative matches. A request that is both selected and indeterminate matches two alternatives, and the record scores the best of them, as the expansion does.

**Rules.**

* Layer 1: `anyOf` has `minItems: 2` and `uniqueItems: true`. Each item is an object of option pins, with no nested `anyOf` and no `state`, `scale` or `colorScheme` key (those are not options).
* SPEC-053 checks each alternative's option names and values as it does the base pins.
* Warning: all alternatives pin the same single option. Use an array value instead (`size: ["s", "m"]`).
* Warning: an alternative that repeats a base pin, or one alternative that contains another (the larger one is redundant).
* The key `anyOf` is reserved. A component **MUST NOT** declare an option with that name.
* The tie guard (`relationship_option_ties`) expands `anyOf` into its alternatives before it compares pin sets.

### Applied to the checkbox

The 25 flagged records keep their pins and gain the alternative: `Control (selected, emphasized)` becomes `Control` with `isEmphasized: true` and `anyOf: [isSelected, isIndeterminate]`, and the other selected, disabled and error records likewise. The recipe's `when` lists for these bindings can collapse to one binding per role, which is what `p6ga.21.3` already asks for.

### Alternatives

| Option                                                                | Why not                                                                                                                                                                          |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duplicate the records with `isIndeterminate: true`                    | Doubles the 25 records, and every future selected variant needs a hand-made duplicate. That is the redundancy the migration is removing, and it needs a parity lint to stay true. |
| A derived option `isChecked` (true for selected or indeterminate)     | Needs computed options in the component declaration, plus solver and validation work. Worth it if a second component shows the same "A or B" pattern; only the checkbox does today.  |
| Keep the qualifier in the context string (the pre-migration state)    | The status quo. It works, but it is the encoding SPEC-093 flags, and it hides the option from the resolver.                                                                       |
| `allOf`, `not` and `xor` alongside `anyOf`                            | No data needs them. `allOf` is the existing AND, and no record says "not this option". Add them when a case appears.                                                              |

### Rollout

Together with the state form, so there is one `anyOf` implementation: spec text and schema, `pinned_options` and `when_score` in `visual.rs`, SPEC-053 and the new warnings, the guard, then the checkbox data and recipe (`p6ga.21.13`, `p6ga.21.3`).

Readers of `scope.options` checked on 2026-11-15, with what each needs:

| Reader                                                                                                              | Change needed                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `relationship.schema.json`                                                                                          | New `anyOf` property in `scope.options`. Today every other key must be a string, boolean or array of them, so old validators reject the key.                                           |
| `pinned_options`, `when_score`, `RELATIONSHIP_RESERVED_OPTIONS` in `sdk/core/src/visual.rs`                         | Read the alternatives and score as in "Option score". Today an undeclared key is dropped, so an unread `anyOf` would make a record apply to every request.                            |
| SPEC-053 (`spec053.rs`), SPEC-065 (`spec065.rs`), `visual_util.rs`, SPEC-066, SPEC-076                              | Add `anyOf` to the reserved keys they already skip (`state`, `scale`, `colorScheme`) and check each alternative. SPEC-065 (error-constraint coverage) must expand alternatives.      |
| `relationship_option_ties.rs` (guard)                                                                               | Expand alternatives into pin sets before comparing.                                                                                                                                 |
| `record_diff.rs` (changelog)                                                                                        | None: it diffs `scope.options` as a whole, so an added or changed `anyOf` shows as a re-scope.                                                                                       |
| `legacy.rs` (`ctr_to_legacy_token`), Figma `mapping/graph.rs`, `tools/token-mapping-analyzer/src/ctr-scope.js`      | Copy every option into a name object. Exclude `anyOf`. Not reachable for the checkbox: its records carry no `legacyKey`.                                                              |
| `public_names.rs`, `graph.rs` scale lookup, `spec_sheet.rs` state lookup, `context_suggest.rs`                      | None: they read named keys (`state`, `scale`, `structure`).                                                                                                                          |
| TUI, MCP tools, wasm bindings                                                                                       | No generic iteration over `scope.options` found by search. Their relationship display code was not read.                                                                             |

### Decisions

1. **The key lives in `scope.options`, not in a sibling `scope.anyOf`.** The block already reserves `state`, `scale` and `colorScheme`, and the readers above already skip reserved keys, so `anyOf` extends that list. A sibling would be ignored silently by any reader that is not updated (the record would then apply to every request), and `record_diff` would need to learn a new field. An unupdated reader that meets the reserved key shows an odd field, which is noticed. `anyOf` is reserved as an option name, and no component declares one.
2. **`when.options` in a recipe does not accept `anyOf`.** Once the relationships carry the OR, the checkbox recipe's duplicate `isSelected` and `isIndeterminate` entries collapse (`p6ga.21.3`). The `when` shape is shared with `visibleWhen` and read by `when_score`, SPEC-066, SPEC-075, SPEC-083 and the spec-sheet generator, so allowing `anyOf` there costs a second schema change and several rules. Revisit when a recipe has several such pairs that cannot move into relationships.
3. **An alternative cannot pin `state`.** The state form above already says "any of these states", so a `state` in an option alternative would give two spellings and a cross-kind OR. It would also mix the two ranking steps: option scoring (`when_score`) and then state and precedence (steps 4 and 5). No record needs it.
