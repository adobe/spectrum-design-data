---
"@adobe/design-data-tui": minor
---

Guard Figma export writes against concurrent changes and verify their readback.

- **sdk/plugins/figma/**: retain raw API metadata, compare concurrent state, remap temporary IDs,
  and verify written values and preserved state.
- **sdk/cli/**: report success only after verification; provide explicit bypasses, numeric tolerance
  and verification reports without retrying ambiguous writes.
- **sdk/README.md**: document write safeguards, recovery and read-only dry runs.

<!-- Copyright 2026 Adobe. All rights reserved. Licensed under Apache-2.0. -->
