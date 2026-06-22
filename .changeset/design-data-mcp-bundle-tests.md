---
"@adobe/design-data-mcp": patch
---

Add bundle-contents regression tests; register package as moon project and wire into CI.

- **test/bundle-contents.test.js**: New test file asserting the staged MCPB bundle
  contains only what it needs to run — zod with `./v4` export present (guards the
  reviewer's zod/v4 startup regression), runtime payload (wasm, component/guideline JSON,
  entry point) present, and dev-only content (`ava`, nested `node_modules`, `pkg/web`,
  Rust `src/`) absent.
- **test/bundle-smoke.test.js**: Replaced silent skip-if-absent with a `test.before`
  self-generation hook (shared via `test/helpers/ensure-bundle.js`) so offline
  initialize+tools/list tests always run rather than silently passing.
- **moon.yml**: Added `stage` task (runs `generate-mcpb.mjs` without pack/validate);
  `test` and `bundle` now declare `~:stage` as a dep so the staged dir is always
  available under moon.
- **.moon/workspace.yml** + **.github/ci-targets.json**: Registered the package as a
  moon project and added `design-data-mcp:test` to CI — previously absent, so no tests
  ran in CI.
