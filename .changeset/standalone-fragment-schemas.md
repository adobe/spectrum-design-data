---
"@adobe/design-data-tui": patch
"@adobe/design-data-wasm": patch
---

Fix standalone platform manifest loading with implementation fragments.

- **sdk/core/src/data_source/embedded.rs**: embed fragment schemas and dependencies.
  Refresh older cached snapshot layouts.
- **sdk/core/src/manifest.rs**: cover ejected mappings and reject invalid implementation rows.
- **sdk/core/build.rs**, **sdk/moon.yml**: rebuild and check embedded schema changes.

<!-- Copyright 2026 Adobe. All rights reserved. -->
