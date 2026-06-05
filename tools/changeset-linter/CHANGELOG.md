# @adobe/changeset-linter

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
