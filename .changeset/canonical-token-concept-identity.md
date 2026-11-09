---
"@adobe/design-data-spec": minor
---

<!-- Copyright 2026 Adobe. All rights reserved. -->

Accept canonical concept identities and scale indices on token records.

- **schemas/token.schema.json**: validate optional `conceptId` UUIDs on both token branches
  and integer-or-string `scaleIndex` values, matching canonical data while preserving
  string-only mode fields.
