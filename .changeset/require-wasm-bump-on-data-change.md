---
"@adobe/changeset-linter": minor
---

Add a `check-data-bump` command that fails CI when dataset content changes
without a pending changeset bumping `@adobe/design-data-wasm`.

- **tools/changeset-linter**: new `isDatasetContentFile`/
  `requireWasmBumpForDataChanges` checks and `check-data-bump` CLI subcommand.
- **.github/workflows/changeset-lint.yml**: run the new check on PRs touching
  `packages/design-data/{tokens,mode-sets,components,fields}`.
