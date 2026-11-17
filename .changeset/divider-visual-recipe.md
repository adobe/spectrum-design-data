---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add a divider visual recipe and anatomy.

- Divider declares one part, `line`, added to the anatomy registry.
- New `staticColor` option (`white`, `black`); unset is the regular gray line.
- Fill relationships pin `size`, `staticColor` and `orientation` in `scope.options`.
- The four static fills now point at the non-deprecated `transparent-static-*` tokens, following
  their `replacedBy` links. Alpha changes: white s/m 0.14 to 0.16, white l 0.85 to 0.80, black l
  0.84 to 0.80. Black s/m stays 0.12. No token values change.
