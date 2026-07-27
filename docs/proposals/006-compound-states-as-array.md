# Proposal 006: Compound States as an Ordered Array

**Status:** Accepted — supersedes [Proposal 005](005-compound-states.md)\
**Affects:** the `state` field on every token name object (all stateful tokens, not just compounds)\
**Spec reference:** taxonomy.md — state field definition; [state-model.md](../../packages/design-data-spec/spec/state-model.md)

## Problem

Proposal 005 encoded two simultaneous states as a single hyphenated string, e.g.
`state: "selected-hover"`. This has two problems:

1. **Not cleanly decomposable.** State ids themselves contain hyphens
   (`keyboard-focus`, `key-focus`, `drag-and-drop`), so a value like
   `selected-keyboard-focus` cannot be split back into its parts by hyphen position
   alone. The validator (`is_valid_compound_state` in `spec009.rs`) copes by trying
   every hyphen boundary and accepting any split where both halves are known state
   words — enough to *validate* the string, not enough to *parse* it back into
   structured parts.
2. **It re-fuses.** Epic `spectrum-design-data-284` exists to decompose tokens that
   fuse multiple concepts into one string field. Encoding two states as one
   hyphenated string is the same fusion, just moved from `property` into `state`.

## Proposal

Represent `state` as an **ordered array of atomic state ids** instead of a string:

```json
"state": ["selected", "hover"]
```

Applied uniformly — every stateful token uses the array form, not just compounds:

```json
"state": ["hover"]
"state": ["disabled"]
"state": ["selected", "hover"]
```

### Ordering convention (unchanged from Proposal 005)

The first element is the **mode state** (persistent selection or focus mode); the
second is the **interaction state** (transient pointer/keyboard interaction):

| Mode states | Interaction states                           |
| ----------- | -------------------------------------------- |
| `selected`  | `default`, `hover`, `down`, `keyboard-focus` |
| `focus`     | `hover`                                      |

### Examples

| Current (Proposal 005) string | Proposal 006 array              |
| ----------------------------- | ------------------------------- |
| `state: "selected-default"`   | `state: ["selected","default"]` |
| `state: "selected-hover"`     | `state: ["selected","hover"]`   |
| `state: "focus-hover"`        | `state: ["focus","hover"]`      |
| `state: "hover"`              | `state: ["hover"]`              |

Each array element is validated independently against the `states` registry — no
segment-splitting heuristic needed, since the elements are already atomic.

### Legacy-key serialization

Legacy kebab-case token names are unaffected: the legacy key still joins the state
segments with `-` in array order, producing byte-identical output to today
(`["selected","hover"]` → `...-selected-hover`, same as the Proposal 005 string).
Tokens with a pinned `legacyKey` (the `compound-state` exceptions in
`naming-exceptions.json`) keep that pin — the array changes only the structured
`name.state` field, not the exception mechanism.

### Schema

* `packages/design-data/fields/state.json`: `valueType` becomes `"array"`.
* `packages/design-data-spec/schemas/token.schema.json`: `state` becomes
  `{"type": "array", "items": {"type": "string", "pattern": "^[a-z][a-z0-9-]*$"}, "minItems": 1}`.
* `packages/design-data/registry/states.json`: `customPattern` simplifies to
  `^[a-z][a-z0-9-]*$` (the array structure now carries compounding; the registry
  pattern only needs to validate one atomic id at a time). The dead `+`-joined
  compound branch in the old pattern is removed.

### Validation

* `SPEC-009` (`name-field-enum-sync`): validates each array element against the
  registry set directly. `is_valid_compound_state`'s hyphen-boundary guessing is
  removed — no longer needed once elements are atomic.
* `SPEC-022` (`component-state-valid`): each array element must match a state
  declared on the referenced component.
* `SPEC-026` / `SPEC-037`: read array elements instead of a string.

### Migration

Every token with a `name.state` value migrates from string to array. Single states
gain a one-element array (`"hover"` → `["hover"]`); compounds split on their known
Proposal-005 boundary into ordered elements. Legacy hyphenated *state ids* that are
themselves compound-looking but are **one state** (`keyboard-focus`, `key-focus`,
`drag-and-drop`) stay as a single array element — they are not split.

## Alternatives considered

* **Keep the hyphenated string (status quo, Proposal 005).** Rejected: undecomposable
  on state ids that themselves contain a hyphen; re-fuses concepts Epic 284 is
  pulling apart.
* **Unordered array.** Rejected: order is semantically load-bearing (mode-state
  before interaction-state per the convention above); an unordered set would make
  `["selected","hover"]` and `["hover","selected"]` equivalent, breaking
  deterministic serialization and discarding the mode-vs-interaction distinction.
* **Array only for compounds, string for single states (`string | array`).** Rejected:
  minimizes data churn but forces every consumer to branch on two shapes
  permanently. A uniform array means every reader handles exactly one shape.

## Impact

* Every stateful token's `name.state` field changes shape (string → array); legacy
  key output is unchanged.
* `naming.rs`: `NameObject.state` becomes `Option<Vec<String>>`; the three legacy-key
  serialization sites join the array; `split_trailing_state` returns ordered segments.
* Validators `SPEC-009`, `SPEC-022`, `SPEC-026`, `SPEC-037` read arrays.
* No change to the `compound-state` category or pinned `legacyKey` mechanism in
  `naming-exceptions.json`.
