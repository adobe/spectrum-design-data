---
"@adobe/design-data-mcp": patch
---

Narrow `design-data-component-tokens` output.

- New `options` argument keeps only bindings that apply under the given option
  values (for example `{ "variant": "accent", "style": "fill" }`). A binding that
  does not pin an option is kept.
- New `colorScheme` and `scale` arguments collapse a binding's per-mode `values`
  to one `value`.
- A `state` that no binding pins (such as `disabled`, which is an option) now
  returns a `stateHint` saying so, instead of silently returning the same
  bindings as the default state.

On a button, `options` plus `colorScheme` and `scale` cut the call from about
44K to 15K characters.
