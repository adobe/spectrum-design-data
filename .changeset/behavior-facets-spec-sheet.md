---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add facets to recipe conditions and a contract-driven spec sheet section
(proposal 022), expand step. No render or spec sheet changes.

- Recipes: `when` and `visibleWhen` accept `facets: { checked: "indeterminate" }`
  beside `options` and `states`. Opt-in: a facet clause folds into the options
  and states the compiler already solves, so recipes without it are unchanged.
  New rule SPEC-122 (warning) flags a facet the component's contract cannot
  publish.
- Spec sheet: for a component with a behavior contract (Switch, Checkbox), the
  accessibility section reads role, focus, keyboard intents and WCAG criteria
  from the contract. The result equals the one built from the `accessibility`
  block; the component-level `intents` labels still come from the block.
