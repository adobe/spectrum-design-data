---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Field value text: the focus and focus-hover color records now say which state they apply to.

- In text-field, picker, search-field, number-field and text-area, the `focus` value color record
  is pinned to `focus-+-not-hover` and the `focus-hover` one to `focus-+-hover`, as the border
  records already are. At keyboard focus only the keyboard-focus record applies, so a render with a
  value no longer reports two tied candidates (bead qkj5.293).
- Resolved colors are unchanged. Legacy `@adobe/spectrum-tokens` output is byte-identical.
