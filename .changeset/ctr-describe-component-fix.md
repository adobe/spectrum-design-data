---
"@adobe/design-data-agent-mcp": patch
---

Fix `describe_component` silently dropping token bindings for CTR-migrated
components (closes spectrum-design-data-x29.4).

- **tools/design-data-agent-mcp/src/tools/read.js**: `describe_component` now
  resolves bindings from `relationships/*.json` (CTRs) in addition to the
  legacy `tokenBindings` field, so migrated components (91 files) no longer
  report empty bindings.
