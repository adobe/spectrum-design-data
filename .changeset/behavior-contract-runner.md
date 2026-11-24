---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add the behavior contract reference runner, event intents and patterns
(proposal 022), expand step. No render or spec sheet changes.

- Registry: `intents.json` gains the `event` intents (`focus`, `blur`,
  `press-start`, `press-end`, `press-cancel`, `pointer-enter`, `pointer-leave`,
  `navigate-next`, `navigate-previous`, `navigate-first`, `navigate-last`).
  `facets.json` gains `blocksInteraction` (the `disabled` facet blocks focus,
  press and hover).
- Spec: `parts.<part>.handles` lists intents that change no state; shared base
  contracts live in `behaviors/patterns/` (`behavior-pattern.schema.json`,
  first pattern `interactive`). SPEC-118 warns on an unresolved `extends`,
  SPEC-119 on an unregistered `handles` intent.
- `design-data behavior test <component|--all>` runs conformance vectors against
  the contract state machines with no browser; `conformance/behavior/` holds the
  Switch and Checkbox suites, and `behaviors/switch.json` and `checkbox.json`
  are their contracts.
- The `accessibility` block is untouched.
