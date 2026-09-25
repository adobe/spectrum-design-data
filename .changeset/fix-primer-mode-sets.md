---
"@adobe/design-data-agent-mcp": patch
---

Fix `primer` returning empty `modeSets` arrays (closes spectrum-design-data-v9bb).

- **tools/design-data-agent-mcp/src/tools/read.js**: build `modeSets` from the
  `modeSets` array already returned by `ds.primer()` instead of the
  field-catalog-only `getFieldValues("colorScheme"|"scale"|"contrast")`, which
  never had entries for mode-set dimensions.
