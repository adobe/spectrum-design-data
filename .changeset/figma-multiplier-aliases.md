---
"@adobe/design-data-tui": patch
---

Fix Figma export of unitless multipliers and the aliases that reference them.

- **sdk/plugins/figma/src/mapping/**: export multipliers as FLOAT and preserve alias references,
  existing IDs, mode sets, and dangling-reference checks.
- **sdk/plugins/figma/src/audit.rs**: report unsupported alias targets with their schema and reason.
- **sdk/cli/**: expose unsupported-target diagnostics and test audit output.
- **sdk/README.md**: document the 11 supported aliases and the remaining exclusions.

<!-- Copyright 2026 Adobe. All rights reserved. Licensed under Apache-2.0. -->
