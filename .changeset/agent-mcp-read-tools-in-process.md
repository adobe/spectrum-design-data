---
"@adobe/design-data-agent-mcp": minor
---

Migrate `primer` and `describe_component` read tools off the native CLI to in-process wasm.

- **tools/read.js**: replace `runCli` for `primer` with wasm `getWasm`/`getDataset`/`getFieldValues`
  composing the primer response; matches sibling `design-data-mcp` pattern.
- **tools/read.js**: replace `runCli` for `describe_component` with direct filesystem read;
  add `validateComponentId` (mirrors `component.rs:validate_id`) to block path traversal.
- **test/read.test.js**: tests for primer shape, id-validation edge cases, and not-found
  error listing available components.
- **package.json**, **README.md**: note that the `design-data` binary is now only needed
  for `authoring_session_step_intent`.
