---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Bind 18 of the 19 swatch recipe selectors to structured identity. The legacy
`@adobe/spectrum-tokens` output, every rendered SVG and every spec sheet are unchanged.

- Swatch bindings select by `property`, `part` and (for the border color and width) `attribute`
  instead of `context`: context selectors 19 to 1. Swatch stays at status level 2: the disabled
  icon color binding keeps its `context`, because its record shares `property` and `part` with
  the disabled icon outline color and a structured selector would name two identities.
- The swatch recipe snapshots gain the `value` option axis (24 option sets become 72): the
  part-only selectors now also match the `value: add` records, so the recipe counts `value` as
  read. Output is the same for every value.
