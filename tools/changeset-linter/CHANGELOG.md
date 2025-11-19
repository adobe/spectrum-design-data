# @adobe/changeset-linter

## 1.0.1

### Patch Changes

- [#582](https://github.com/adobe/spectrum-design-data/pull/582) [`a0a188e`](https://github.com/adobe/spectrum-design-data/commit/a0a188ec8ff8a7a3cc554c14487569a9eb4ba31e) Thanks [@GarthDB](https://github.com/GarthDB)! - fix(changeset-linter): add pattern recognition for component schema diff reports
  - Add `## Component Schema Diff Report` pattern to exempt component diff sections from length limits
  - Add `Generated using @adobe/spectrum-component-diff-generator` pattern for tool-generated content
  - Ensures changesets with automated diff reports don't trigger false positive length warnings
