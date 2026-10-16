# @adobe/changeset-linter

## 1.2.0

### Minor Changes

- [#1509](https://github.com/adobe/spectrum-design-data/pull/1509) [`6540815`](https://github.com/adobe/spectrum-design-data/commit/6540815fcaa9d1253a32021a649955ae4f694242) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a `check-data-bump` command that fails CI when dataset content changes
  without a pending changeset bumping `@adobe/design-data-wasm`.
  - **tools/changeset-linter**: new `isDatasetContentFile`/
    `requireWasmBumpForDataChanges` checks and `check-data-bump` CLI subcommand.
  - **.github/workflows/changeset-lint.yml**: run the new check on PRs touching
    `packages/design-data/{tokens,mode-sets,components,fields}`.

### Patch Changes

- [#1511](https://github.com/adobe/spectrum-design-data/pull/1511) [`4dfabb3`](https://github.com/adobe/spectrum-design-data/commit/4dfabb3664753f1eb3d3af181ae43b1c8b0bbeb3) Thanks [@GarthDB](https://github.com/GarthDB)! - Scope the `check-data-bump` guard to changesets added in the PR diff, not
  every pending changeset on disk.
  - **tools/changeset-linter**: replace `readPendingChangesetContents` with
    `getChangedChangesetContents`, which only reads `.changeset/*.md` files
    added or modified relative to the base ref, so an unrelated pre-existing
    changeset can no longer satisfy the guard for a new dataset change.

## 1.1.0

### Minor Changes

- [`e95ff6f`](https://github.com/adobe/spectrum-design-data/commit/e95ff6f069d99c5d3f51418034453bedccc9e4fe) Thanks [@GarthDB](https://github.com/GarthDB)! - Validate frontmatter package names against the pnpm workspace.
  - **src/index.js** (`getWorkspacePackageNames`): new export; reads `pnpm-workspace.yaml`
    globs and each `package.json` to build the canonical name Set without extra deps.
  - **src/index.js** (`lintChangeset`): new optional `validPackageNames` param; pushes an
    error for any frontmatter name absent from the Set, with a "did you mean" hint for the
    common unscoped→scoped mistake (e.g. `design-data-tui` → `@adobe/design-data-tui`).
  - **src/cli.js** (`check-file`): now async; discovers names before linting so the
    pre-commit hook catches bad names at commit time.

## 1.0.1

### Patch Changes

- [#582](https://github.com/adobe/spectrum-design-data/pull/582) [`a0a188e`](https://github.com/adobe/spectrum-design-data/commit/a0a188ec8ff8a7a3cc554c14487569a9eb4ba31e) Thanks [@GarthDB](https://github.com/GarthDB)! - fix(changeset-linter): add pattern recognition for component schema diff reports
  - Add `## Component Schema Diff Report` pattern to exempt component diff sections from length limits
  - Add `Generated using @adobe/spectrum-component-diff-generator` pattern for tool-generated content
  - Ensures changesets with automated diff reports don't trigger false positive length warnings
