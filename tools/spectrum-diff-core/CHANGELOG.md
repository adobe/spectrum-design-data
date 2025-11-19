# @adobe/spectrum-diff-core

## 1.1.1

### Patch Changes

- [`2a137c3`](https://github.com/adobe/spectrum-design-data/commit/2a137c376bd1b7a4cc445db6bb70d8466389d5e6) Thanks [@GarthDB](https://github.com/GarthDB)! - fix(ci): resolve GitHub Actions output formatting for empty diff reports

  This patch ensures component diff workflows handle empty output correctly without causing EOF delimiter errors in GitHub Actions.

## 1.1.0

### Minor Changes

- [#573](https://github.com/adobe/spectrum-design-data/pull/573) [`cd74579`](https://github.com/adobe/spectrum-design-data/commit/cd745798b88a137ee6fac8734cc872626fd09060) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(tools): add component schema diff generator with shared core library

  **New Tools:**
  - `@adobe/spectrum-component-diff-generator` - CLI tool for comparing component schemas between versions/branches
  - `@adobe/spectrum-diff-core` - Shared library providing common diff functionality across tools

  **Key Features:**
  - Dynamic file discovery using GitHub API
  - Breaking vs non-breaking change detection for JSON schemas
  - Support for remote-to-remote, remote-to-local, and local-to-local comparisons
  - Professional markdown, JSON, and CLI output formats
  - Integration with GitHub Actions for automated PR comments
  - Comprehensive test coverage with AVA

  **CLI Usage:**

  ```bash
  # Compare between versions
  sdiff report --osv v1.0.0 --nsv v1.1.0 --format markdown

  # Compare between branches
  sdiff report --osb main --nsb feature-branch --format json

  # Local comparisons
  sdiff report --osv v1.0.0 --local packages/component-schemas
  ```

  This enables automated component schema change detection and reporting across Adobe Spectrum's design system workflow.
