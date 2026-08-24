---
"@adobe/design-data-tui": minor
"@adobe/design-data-wasm": minor
---

Enforce cascade type-safety on manifest overrides targeting alias-only tokens.

- **sdk/core/src/graph.rs**: `resolve_override_targets` now resolves the shadowed
  token's value through its alias chain (`TokenRecord::resolve_leaf`) instead of
  only reading a literal `value`, so an override that changes a `$ref`-aliased
  token's value type (e.g. color → dimension) is rejected like the existing
  literal-value case, instead of silently applying.
