---
"@adobe/token-diff-generator": patch
"@adobe/spectrum-design-data-mcp": patch
"token-csv-generator": patch
---

feat(tooling): add renamed property support to token processing tools

Updated token processing tools to extract and display the new `renamed` property:

- **MCP Token Processor**: Extracts `renamed`, `deprecated`, and `deprecated_comment` properties in token results
- **CSV Generator**: Added `renamed`, `deprecated`, and `deprecated_comment` columns to CSV export
- **Diff Generator**: Updated documentation - tool automatically tracks `renamed` property changes

These updates support the new `renamed` property added to the token schema for tracking 1:1 token replacements.
