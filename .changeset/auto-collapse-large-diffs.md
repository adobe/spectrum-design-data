---
"@adobe/token-diff-generator": patch
"@adobe/spectrum-component-diff-generator": patch
---

feat: auto-collapse details sections with more than 20 items

Diff report templates now automatically collapse `<details>` sections
when they contain more than 20 items, improving readability for large
diffs like repository-wide changes. Sections with 20 or fewer items
remain open by default for quick scanning.

