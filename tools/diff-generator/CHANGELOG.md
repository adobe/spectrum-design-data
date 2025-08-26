# @adobe/token-diff-generator

## 2.5.1

### Patch Changes

- Updated dependencies [[`2a137c3`](https://github.com/adobe/spectrum-tokens/commit/2a137c376bd1b7a4cc445db6bb70d8466389d5e6)]:
  - @adobe/spectrum-diff-core@1.1.1

## 2.5.0

### Minor Changes

- [`6fe3d3a`](https://github.com/adobe/spectrum-tokens/commit/6fe3d3a64e0da4e07cef86e70590b5af65a70470) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(diff-tools): improve error handling and GitHub PR comment format
  - Align component diff generator GitHub PR comment format with token diff style
  - Add comprehensive error handling and test coverage for both tools
  - Improve reliability and developer experience with consistent tooling

## 2.4.0

### Minor Changes

- [#577](https://github.com/adobe/spectrum-tokens/pull/577) [`e4053fb`](https://github.com/adobe/spectrum-tokens/commit/e4053fb7a92c000c6c6efde1766766e8fa6aa0d2) Thanks [@GarthDB](https://github.com/GarthDB)! - **feat(diff-tools): improve error handling and GitHub PR comment format**

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

## 2.3.1

### Patch Changes

- Updated dependencies [[`cd74579`](https://github.com/adobe/spectrum-tokens/commit/cd745798b88a137ee6fac8734cc872626fd09060)]:
  - @adobe/spectrum-diff-core@1.1.0

## 2.3.0

### Minor Changes

- [#549](https://github.com/adobe/spectrum-tokens/pull/549) [`32db4f1`](https://github.com/adobe/spectrum-tokens/commit/32db4f1de2c6895b2fca7144add7978b751c87a0) Thanks [@GarthDB](https://github.com/GarthDB)! - **Performance Optimization: Introduce High-Performance Diff Algorithm**

  This release introduces significant performance improvements to the token diff generation process:

  ## New Package: `@adobe/optimized-diff`
  - **New high-performance diff algorithm** optimized specifically for design token structure
  - **63.7% performance improvement** (37.40ms → 13.57ms) on real Spectrum token data
  - **2.8x faster execution** compared to generic diff libraries
  - **Token-aware comparison logic** with Set-based key lookups for O(1) performance
  - **Early reference checking** to skip expensive deep comparisons
  - **Zero breaking changes** - drop-in replacement for existing diff operations

  ## Enhanced `@adobe/token-diff-generator`
  - **Integrated optimized diff algorithm** for dramatically improved performance
  - **Maintains full backward compatibility** with existing API
  - **Fixed missing `glob` dependency** that was causing runtime errors
  - **Comprehensive performance analysis** and optimization documentation
  - **Enhanced test suite** for optimization validation
  - **Improved memory efficiency** and better scaling characteristics

  ## Performance Metrics
  - **77% faster** core diff operations in testing
  - **Linear O(n) scaling** maintained with better constants
  - **Reduced memory usage** with more predictable patterns
  - **No breaking changes** to existing workflows or APIs

  This optimization specifically addresses the primary bottleneck in token comparison operations while maintaining the same high-quality output and full compatibility with existing integrations.

### Patch Changes

- Updated dependencies [[`32db4f1`](https://github.com/adobe/spectrum-tokens/commit/32db4f1de2c6895b2fca7144add7978b751c87a0)]:
  - @adobe/optimized-diff@2.0.0

## 2.2.1

### Patch Changes

- [#542](https://github.com/adobe/spectrum-tokens/pull/542) [`0086702`](https://github.com/adobe/spectrum-tokens/commit/0086702ff124460246a0d2cb166e96552d852d11) Thanks [@GarthDB](https://github.com/GarthDB)! - Fixed missing github-api-key.js file in published package.

## 2.2.0

### Minor Changes

- [#540](https://github.com/adobe/spectrum-tokens/pull/540) [`47692c3`](https://github.com/adobe/spectrum-tokens/commit/47692c3d3a1bc388ce02f098aef491277e08779d) Thanks [@GarthDB](https://github.com/GarthDB)! - # Improve code quality and developer experience
  - Remove unused dependencies (`emojilib`, `inquirer`, `tar`, `tmp-promise`) reducing package size
  - Add comprehensive ESLint configuration with enhanced error detection and auto-fixing
  - Replace experimental JSON imports with standard approach to eliminate Node.js warnings
  - Remove legacy `formatterCLI.js` code (401 lines) replaced by Handlebars templates
  - Add development tooling: `ava.config.js`, lint scripts (`pnpm run lint`, `pnpm run lint:fix`)
  - Enhance package.json metadata with better description, keywords, and npm publishing configuration
  - Improve test infrastructure with centralized JSON loading utilities
  - Fix documentation version consistency and test schema issues

  All changes are backward compatible. No migration required.

## 2.1.0

### Minor Changes

- [#530](https://github.com/adobe/spectrum-tokens/pull/530) [`9b891f8`](https://github.com/adobe/spectrum-tokens/commit/9b891f86b0162144f2be614cec55bfa23b6bf041) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(diff-generator): add Handlebars formatter support with templates

  Added comprehensive Handlebars support to the token diff generator:
  - **New Handlebars formatter**: Added `formatterHandlebars.js` with support for custom template rendering
  - **Template system**: Added multiple built-in templates:
    - `default.hbs` - Standard diff output with enhanced formatting
    - `json.hbs` - JSON-formatted output
    - `plain.hbs` - Plain text output
    - `summary.hbs` - Condensed summary format
  - **CLI integration**: Integrated Handlebars formatter into the CLI with template selection options
  - **Test coverage**: Added comprehensive test suite for the new Handlebars functionality
  - **Documentation**: Updated README with usage examples and template documentation

  This enhancement provides greater flexibility in customizing diff output formats while maintaining backward compatibility with existing functionality.

## 2.0.0

### Major Changes

- [`312a3d2`](https://github.com/adobe/spectrum-tokens/commit/312a3d263bb0d72cd40db180a19c4d5282d5649d) Thanks [@GarthDB](https://github.com/GarthDB)! - The latest version of [commander](https://www.npmjs.com/package/commander) requires that each option short flag can only consist of a single character.

  Changes:

  | Old flag | New flag |
  | -------- | -------- |
  | `-otv`   | `--otv`  |
  | `-ntv`   | `--ntv`  |
  | `-otb`   | `--otb`  |
  | `-ntb`   | `--ntb`  |
  | `-tn`    | `-n`     |
  | `-gak`   | `-g`     |

## 1.3.0

### Minor Changes

- [#443](https://github.com/adobe/spectrum-tokens/pull/443) [`b371af5`](https://github.com/adobe/spectrum-tokens/commit/b371af50645fe04ef4aef286b7350e3113a4ff3a) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - Format and output command line options added.

  ```
  Options:
    -otv, --old-token-version <oldVersion>  indicates which github tag to pull old tokens from
    -ntv, --new-token-version <newVersion>  indicates which github tag to pull new tokens from
    -otb, --old-token-branch <oldBranch>    indicates which branch to fetch old token data from
    -ntb, --new-token-branch <newBranch>    indicates which branch to fetch updated token data from
    -tn, --token-names <tokens...>          indicates specific tokens to compare
    -l, --local <path>                      indicates to compare to local data
    -r, --repo <name>                       github repository to target
    -gak, --githubAPIKey <key>              github api key to use
    -f, --format <format>                   cli (default) or markdown
    -o, --output <path>                     file path to store diff output
    -d, --debug <path>                      file path to store diff json
    -h, --help                              display help for command
  ```

## 1.2.0

### Minor Changes

- [`254ba19`](https://github.com/adobe/spectrum-tokens/commit/254ba1927b78d8c5cefbdb4fe35f3aff162efaee) Thanks [@GarthDB](https://github.com/GarthDB)! - minor fixes to diff tool comparisons

## 1.1.2

### Patch Changes

- [#430](https://github.com/adobe/spectrum-tokens/pull/430) [`fccd972`](https://github.com/adobe/spectrum-tokens/commit/fccd97294e300ff6e755334c3bff83da0caf1247) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix version number in cli using a prepare script in the package.json file

## 1.1.1

### Patch Changes

- [#423](https://github.com/adobe/spectrum-tokens/pull/423) [`9a36be0`](https://github.com/adobe/spectrum-tokens/commit/9a36be01e5c0305dea7d8d9bdbd33c86d9a53399) Thanks [@GarthDB](https://github.com/GarthDB)! - Fixed issue when version number was hardcoded.

## 1.1.0

### Minor Changes

- [#407](https://github.com/adobe/spectrum-tokens/pull/407) [`c186fb8`](https://github.com/adobe/spectrum-tokens/commit/c186fb8e2129bc2f4e40aa00b06984b34cabe63b) Thanks [@GarthDB](https://github.com/GarthDB)! - Replaced --test with --local to make it easier to compare released changes with a local branch'

## 1.0.1

### Patch Changes

- [#394](https://github.com/adobe/spectrum-tokens/pull/394) [`71b38bd`](https://github.com/adobe/spectrum-tokens/commit/71b38bd99262e707ba6333a4d14d1e90ab95d502) Thanks [@GarthDB](https://github.com/GarthDB)! - Fixed author

## 1.0.0

### Major Changes

- [#344](https://github.com/adobe/spectrum-tokens/pull/344) [`8a021e0`](https://github.com/adobe/spectrum-tokens/commit/8a021e0593d5d1bc190bbe6472747135f735791c) Thanks [@shirlsli](https://github.com/shirlsli)! - Initial release of the token diff generator library and cli
