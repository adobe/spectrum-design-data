---
"@adobe/changeset-linter": minor
---

Validate frontmatter package names against the pnpm workspace.

- **src/index.js** (`getWorkspacePackageNames`): new export; reads `pnpm-workspace.yaml`
  globs and each `package.json` to build the canonical name Set without extra deps.
- **src/index.js** (`lintChangeset`): new optional `validPackageNames` param; pushes an
  error for any frontmatter name absent from the Set, with a "did you mean" hint for the
  common unscoped→scoped mistake (e.g. `design-data-tui` → `@adobe/design-data-tui`).
- **src/cli.js** (`check-file`): now async; discovers names before linting so the
  pre-commit hook catches bad names at commit time.
