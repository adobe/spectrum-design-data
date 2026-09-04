---
"@adobe/design-data-mcp": patch
"@adobe/design-data-agent-mcp": patch
---

Warn at runtime when the embedded dataset is behind latest published
@adobe/spectrum-design-data (closes spectrum-design-data-9fe.5).

- **tools/design-data-agent-mcp/src/dataset-freshness.js**: new best-effort
  npm-registry version check, silent on any network failure.
- **tools/design-data-agent-mcp/src/tools/read.js**: `primer` now returns
  `provenance.datasetStatus` and logs a stderr warning once when stale.
- **tools/design-data-mcp/src/dataset-freshness.js**: same check, duplicated
  per package (no shared dependency between the two servers).
- **tools/design-data-mcp/src/tools/design-data.js**: `design-data-primer`
  gets the same `datasetStatus` field and warning.
