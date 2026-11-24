---
"@adobe/design-data-mcp": minor
"@adobe/design-data-skill": patch
---

`design-data-component-tokens` gets `view: "states"`: one row per context and part
with the token and value for default, hover, down, keyboard-focus and disabled,
for the requested `options`, `colorScheme` and `scale`. Sizes are collapsed to
`options.size` (recognized from the `-75`/`-100`/... property or `-small`/`-medium`
token suffix), and `disabled` comes from the bindings pinned to `isDisabled`. For
a button this is about 4-5K characters instead of 24-44K.

- A component with no state-pinned relationships (switch) gets a `stateHint`
  pointing at `design-data-query` with `component=` and `state=`.
- The default view adds a `viewHint` when a call returns more than 40 bindings.
- `design-data-component` and `design-data-component-tokens` descriptions now say
  what a missing binding means and that `constraints` and guideline text are what
  the system states, not a list of what is not allowed.
