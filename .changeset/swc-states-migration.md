---
"@adobe/spectrum-design-data": patch
---

Remove `web-components-states.json` from the foundation registry (closes DNA-1741).

- **registry/platform-extensions/web-components-states.json**: removed — the
  canonical copy now lives in `platforms/web-components/extensions/platform-extensions/`
  and is reachable via the manifest cascade, mirroring the earlier
  `ios-states.json` migration.
