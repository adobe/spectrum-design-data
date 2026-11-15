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

A record with `anyOf` elements is equivalent to one record per combination of members, all with the same `$ref`. Implementations may evaluate it directly or expand it, but must give the same answer as the expansion.

For the resolution algorithm in `state-model.md`:

1. **Candidate test (step 3).** An `anyOf` element counts as active when any member is active.
2. **Specificity (step 4).** An `anyOf` element counts as one matched state, however many of its members are active. The expansion agrees: it has one record per member, each matching one state.
3. **Precedence (step 5).** An `anyOf` element contributes the precedence of its **highest-precedence active member**. With hover (50) and down (70) both active, the group counts as 70, the same as the `["down"]` record would in the expansion.
4. **Ties (step 6).** Unchanged.

### Where it applies

Only `relationship.scope.options.state`. Token `name.state` stays atomic, because names are identity keys and a name that matches several states would stop being one.

### Validation

* **Layer 1** (`relationship.schema.json`): each `state` element is a string or `{ anyOf: [string, ...] }` with at least two members.
* **SPEC-054** (`ctr-state-valid`) checks every member against the component's declared states, as it does for plain ids.
* A member listed twice, or an `anyOf` with a single member, is a warning: write the id directly.
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
2. Is "highest-precedence active member" the right rule for step 3 of the algorithm, or should a group take the precedence of its first listed member? The data's same-token merges give the same result either way.
