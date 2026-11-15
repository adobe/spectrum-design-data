<!-- Copyright 2026 Adobe. All rights reserved. -->

# Proposal 017: "Any of these states" in relationship scope

**Status:** Draft. Nothing is built.\
**Affects:** `packages/design-data-spec/spec/relationship-format.md`, `spec/state-model.md` (resolution algorithm), `schemas/relationship.schema.json`, `sdk/core/src/visual.rs` (`scope_state_ids`, `resolve_candidates`), `validate/rules/spec054.rs`, 43 groups of relationship records in 6 components.\
**Beads:** `p6ga.21.5` (this proposal), `p6ga.21.8` (breadcrumbs), `p6ga.21.4` (redundancy lint that finds the cases). Epic `p6ga.21`.

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
