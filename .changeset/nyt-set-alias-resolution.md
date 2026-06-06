---
"@adobe/design-data-wasm": minor
"s2-tokens-viewer": patch
---

Fix set-level alias resolution in `resolve_reference` after cache reload.

- **`sdk/core/src/graph.rs`**: add `set_uuid_index` (set_uuid → all children) populated in
  all graph builders and `rebuild_uuid_index`; add `resolve_set_in_context` and
  `resolve_alias_in_context` for context-aware chain walking through set-level UUID aliases.
- **`sdk/core/src/cascade.rs`**: extract `resolve_reference(graph, slug, ctx)` as a
  testable core function with deterministic tie-breaking and graceful dangling-ref handling.
- **`sdk/wasm/src/dataset.rs`**: delegate `resolveReference` to the core function;
  remove spike-status comment.
- **`packages/design-data-spec/conformance/reference/`**: 4 new fixture-driven
  conformance cases (set-alias-light, set-alias-dark, dangling-ref, unknown-slug).
- **`sdk/wasm/test/parity.test.js`**: 7 new parity tests (wireframe, scale, set-alias
  regression, dangling-ref degradation, stable tie-break).
- **`docs/s2-tokens-viewer/scripts/resolve.mjs`**: remove JS fallback (now redundant);
  `wasm: 9062 | fallback: 0 | missing: 0`.
