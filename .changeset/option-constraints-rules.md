---
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

Validate option constraints in the Rust SDK.

- **SPEC-064** (error, Layer 2): every option name and value in a constraint's `when` / `require`
  must be declared in the component's `options`. Silent when an option has no `values` list.
- **SPEC-065** (warning, Layer 2): a visual recipe rule or relationship `scope.options` that
  matches only combinations excluded by an `error` constraint.
- **sdk/core**: new `constraints` module reads `component.constraints` into a typed model.
- Conformance fixtures for both rules under `conformance/{valid,invalid}`.
