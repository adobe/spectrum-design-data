---
"@adobe/design-data-spec": minor
"@adobe/design-data": minor
"@adobe/design-data-wasm": patch
---

The behavior runner supports single-thumb value ranges (slider), decisions A658 and A661.

- A contract may carry a `range` block (value, min, max, step options, `page`, `mirror`) and the
  one action `do.adjust` (`by` one step or page, or `to` min, max or a pointer position).
- The runner snaps to the step (half away from the minimum), clamps, keeps whole numbers whole
  and emits `change` only when the value changed.
- New intents `increment-page`, `decrement-page`, `set-min`, `set-max` and the event `move`
  (a step carries `position`, 0 to 1); a new `range` pattern; web binds the `slider` role.
- SPEC-119 warns on a `range` option missing from `state` and on `do.adjust` with no `range`.
- No component has a range contract yet.
- A decimal half snaps away from the minimum despite float noise; a non-numeric option fails.
