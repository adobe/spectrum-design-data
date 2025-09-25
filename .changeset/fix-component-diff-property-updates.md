---
"@adobe/spectrum-component-diff-generator": patch
---

fix(component-diff): correctly identify property updates vs deletions

Fixes issue where removing `default: null` values and updating enum arrays were incorrectly reported as property deletions (breaking changes) instead of property updates (non-breaking changes).

**Key Improvements:**

- Enhanced breaking change detection to distinguish between true property deletions and property updates
- Correctly identifies `default: null` removal as non-breaking
- Correctly identifies enum value additions as non-breaking
- Maintains accurate detection of actual breaking changes (enum value removal, property deletion)
- Added comprehensive test coverage for edge cases

**Technical Details:**

- Updated `isComponentChangeBreaking()` logic in `src/lib/component-diff.js`
- Added smart detection for property updates vs true deletions
- Fixed false positive breaking change reports for menu component and similar schemas

This resolves the issue reported in PR #613 where menu component changes were incorrectly flagged as breaking.
