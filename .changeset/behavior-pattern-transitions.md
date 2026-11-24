---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Carry the interaction event transitions as data in the `interactive` behavior
pattern (proposal 022). No render or spec sheet changes.

- Schema: a transition may name the event's `via`, and `do` may `raise` the
  part's `press` intent. A pattern's `do.set` may set the interaction facets it
  publishes.
- Data: `behaviors/patterns/interactive.json` holds what `focus`, `blur`,
  `press-start`, `press-end`, `press-cancel`, `pointer-enter` and
  `pointer-leave` do to `focusVisible`, `pressed` and `hovered`.
- `press-end` without a prior `press-start` (or after `press-cancel`) no longer
  raises `press`. Two new vectors each for Switch and Checkbox cover it.
- SPEC-119 now also checks a pattern's transitions. Spec page and proposal
  text updated.
