# @adobe/spectrum-component-diff-generator

## 1.4.0

### Minor Changes

- [#613](https://github.com/adobe/spectrum-design-data/pull/613) [`433efdd`](https://github.com/adobe/spectrum-design-data/commit/433efdd18f9b0842ae55acac3cd0fbc1e5e5db58) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(component-diff): enhance property change descriptions

  Improves diff reporting with clear change descriptions instead of confusing
  "deleted + added" reports. Fixes incorrect breaking change classification.
  - Property updates show specific changes (e.g., "removed default: null")
  - Eliminates false "property deleted" reports
  - Correctly identifies `default: null` removal as non-breaking
  - Eliminates duplicate property reporting

  Example: `selectionMode` now shows "removed default: null, added enum values"
  instead of both "Added: selectionMode" and "Removed: selectionMode".

### Patch Changes

- [#613](https://github.com/adobe/spectrum-design-data/pull/613) [`433efdd`](https://github.com/adobe/spectrum-design-data/commit/433efdd18f9b0842ae55acac3cd0fbc1e5e5db58) Thanks [@GarthDB](https://github.com/GarthDB)! - fix(component-diff): correctly identify property updates vs deletions

  Fixes issue where removing `default: null` values and updating enum arrays were
  incorrectly reported as property deletions (breaking changes) instead of
  property updates (non-breaking changes).

  **Key Improvements:**
  - Enhanced breaking change detection to distinguish property updates vs deletions
  - Correctly identifies `default: null` removal as non-breaking
  - Correctly identifies enum value additions as non-breaking
  - Maintains accurate detection of actual breaking changes
  - Added comprehensive test coverage for edge cases

  This resolves the issue reported in PR #613 where menu component changes were
  incorrectly flagged as breaking.

## 1.3.2

### Patch Changes

- [`50a6e4b`](https://github.com/adobe/spectrum-design-data/commit/50a6e4b265a1cd9da47563b4cac4456c6781ffcc) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix null data handling in markdown report generation

  Improve error handling in generateMarkdownReport function to properly validate diffResult input and prevent "Cannot read properties of null" errors during CI diff report generation. This fixes failures in the changeset release process when generating component schema diff reports.

## 1.3.1

### Patch Changes

- Updated dependencies [[`2a137c3`](https://github.com/adobe/spectrum-design-data/commit/2a137c376bd1b7a4cc445db6bb70d8466389d5e6)]:
  - @adobe/spectrum-diff-core@1.1.1

## 1.3.0

### Minor Changes

- [`6fe3d3a`](https://github.com/adobe/spectrum-design-data/commit/6fe3d3a64e0da4e07cef86e70590b5af65a70470) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(diff-tools): improve error handling and GitHub PR comment format
  - Align component diff generator GitHub PR comment format with token diff style
  - Add comprehensive error handling and test coverage for both tools
  - Improve reliability and developer experience with consistent tooling

## 1.2.0

### Minor Changes

- [#577](https://github.com/adobe/spectrum-design-data/pull/577) [`e4053fb`](https://github.com/adobe/spectrum-design-data/commit/e4053fb7a92c000c6c6efde1766766e8fa6aa0d2) Thanks [@GarthDB](https://github.com/GarthDB)! - **feat(diff-tools): improve error handling and GitHub PR comment format**

  This update significantly improves both diff tools with better error handling, comprehensive test coverage, and enhanced GitHub PR comment formatting.

  ## Component Diff Generator Improvements

  ### ✅ GitHub PR Comment Format Alignment
  - **Collapsible details sections** for better visual hierarchy (resolves #576)
  - **Handlebars templating** for consistent formatting with token diff generator
  - **Progressive disclosure** - key info visible, details collapsed by default
  - **Branch/version information** prominently displayed at top

  ### ✅ Comprehensive Test Coverage
  - **11 new template error handling tests** covering malformed templates, missing files, permission errors
  - **6 new real-world integration tests** with actual Adobe Spectrum component schemas
  - **Doubled test count**: 17 → 34 tests with 100% code coverage maintained

  ## Token Diff Generator Improvements

  ### ✅ Enhanced Error Handling & Test Coverage
  - **10+ new formatter error handling tests** for template processing edge cases
  - **12+ new store-output edge case tests** for file system operations
  - **Improved coverage**: store-output.js from 69% → 84% (+14.71%)
  - **Total test count**: ~238 → 260 tests (+22 tests)

  ### ✅ Robust Error Scenarios Tested
  - Template syntax errors and missing helpers
  - File permission and access errors
  - Large dataset performance testing
  - Unicode and special character handling
  - Concurrent write operations
  - Network timeout simulations

  ## Business Impact
  - **Reduced PR review friction** with better formatted diff comments
  - **Improved reliability** through comprehensive error handling
  - **Better developer experience** with consistent tooling across diff generators
  - **Production-ready** with 294 total tests passing and zero breaking changes

  ## Technical Details
  - All existing functionality preserved (zero breaking changes)
  - Enhanced error messages and graceful failure handling
  - Performance tested with large Adobe Spectrum-scale schemas
  - Cross-platform compatibility maintained
  - Memory usage optimized for large datasets

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

### Patch Changes

- Updated dependencies [[`cd74579`](https://github.com/adobe/spectrum-design-data/commit/cd745798b88a137ee6fac8734cc872626fd09060)]:
  - @adobe/spectrum-diff-core@1.1.0
