---
"@adobe/spectrum-component-diff-generator": minor
"@adobe/token-diff-generator": minor
---

feat(diff-tools): improve error handling and GitHub PR comment format

**Component Diff Generator:**

- Align PR comment format with token diff style (resolves #576)
- Add collapsible details sections for better visual hierarchy
- Add 17 new tests covering template errors and real-world scenarios

**Token Diff Generator:**

- Add 22 new tests for formatter and file operation edge cases
- Improve store-output.js coverage from 69% to 84%
- Enhanced error handling for production reliability

All changes are non-breaking with 294 total tests passing.
