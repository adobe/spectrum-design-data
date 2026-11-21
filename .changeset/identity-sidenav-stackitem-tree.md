---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Migrate side-navigation, stack-item and tree-view to level 2 identity (5m92.6).

- Every live record now names a part or a between, no property name carries structure, and
  no identity is shared by records with different contexts.
- Fused names are decomposed: icon size, minimum and fixed heights, font size and line height
  get a part and a scale pin. Edge, item and indicator spacing becomes space-between with
  start-edge, end-edge, top-edge and bottom-edge endpoints.
- Colour records get an attribute (background or border) and colorScheme pins. Background,
  opacity and label colour records of stack-item and tree-view share one context each and pin
  the state that the old qualifier named.
- Side navigation: the second and third level indent records pointed at the same tokens, so
  four exact duplicates are removed.
- Deprecated records and legacy keys are untouched.

Legacy `@adobe/spectrum-tokens` output is byte-identical.
