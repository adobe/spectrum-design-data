---
"@adobe/spectrum-component-diff-generator": patch
---

fix(component-diff): correctly identify property updates vs deletions

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
