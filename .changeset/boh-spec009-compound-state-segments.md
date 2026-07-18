---
"@adobe/spectrum-design-data": patch
---

SPEC-009 now validates compound `state` values segment-by-segment instead of
requiring the whole hyphenated string to match a literal registry entry,
silencing 6 permanent-noise warnings from Proposal 005's compound-state
convention (closes bead boh).

- **sdk/core/src/validate/rules/spec009.rs**: for the `state` field, a value
  that fails the whole-string registry lookup is now checked at every hyphen
  boundary (`{mode-state}-{interaction-state}`), so multi-word interaction
  states like `keyboard-focus` aren't mis-split; a value only warns if no
  split has both halves in the registry.
