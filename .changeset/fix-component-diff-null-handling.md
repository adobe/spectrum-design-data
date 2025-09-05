---
"@adobe/spectrum-component-diff-generator": patch
---

Fix null data handling in markdown report generation

Improve error handling in generateMarkdownReport function to properly validate diffResult input and prevent "Cannot read properties of null" errors during CI diff report generation. This fixes failures in the changeset release process when generating component schema diff reports.
