---
"@adobe/design-data-spec": major
"@adobe/design-data-wasm": minor
"@adobe/spectrum-design-data": minor
---

A component's `slots` now own every fact about a slot (RFC #1801). Breaking for readers of the
component and recipe formats.

- `slotDeclaration` gains `part` (the anatomy part), `accepts` (component names), `acceptsOnly`,
  `min`, `max` and `collection` (the array option whose entries repeat `part`). `required` is
  removed: `min` of 1 or more replaces it.
- New rule SPEC-104 checks the part, the `accepts` components, the collection option, its
  anatomy parent, `min` and `max`, unique names, and warns when a slot is not named `default` or
  after its part. It replaces SPEC-021 (the canonical slot vocabulary), which is retired.
- A recipe's `repeat` loses `part` and `option`; it keeps `slot`, `label` and `with`. The
  collection slot gives the repeated part and the option. SPEC-060 checks the slot and that the
  declaring part is the repeated part's anatomy parent; SPEC-066 reads the option through it.
  Compiled recipe data (`data.json`) is unchanged, so the solver, WASM and the browser engine
  read the same shape and renders are byte-identical.
- Button declares its two slots with a `part`; accordion declares `default` (the `items`
  collection), `actions` (accepts `action-button` and `switch`) and `content`. Migrate a recipe's
  `repeat: {part, option}` to a collection slot plus `repeat: {slot}`.
