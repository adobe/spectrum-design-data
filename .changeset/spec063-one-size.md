---
"@adobe/design-data-spec": minor
"@adobe/design-data-tui": patch
"@adobe/design-data-wasm": patch
---

SPEC-063 lets a component with no `size` option declare a one-entry `sizeScale`, the single
size renderers draw (for example the fixed-size iOS switch). More than one entry on such a
component is still an error. `component-visuals.md` and `rules.yaml` say so. The native binary
is versioned by `@adobe/design-data-tui`.
