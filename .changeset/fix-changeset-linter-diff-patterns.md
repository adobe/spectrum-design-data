---
"@adobe/changeset-linter": patch
---

fix(changeset-linter): add pattern recognition for component schema diff reports

- Add `## Component Schema Diff Report` pattern to exempt component diff sections from length limits
- Add `Generated using @adobe/spectrum-component-diff-generator` pattern for tool-generated content
- Ensures changesets with automated diff reports don't trigger false positive length warnings
