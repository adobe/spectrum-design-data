---
"@adobe/design-data-tui": patch
---

Fix Figma export of named font weights, numeric angles, multipliers, and their aliases.

- **sdk/plugins/figma/src/mapping/**: export named weights as STRING and angles and multipliers
  as FLOAT; preserve schema types, scalar/mode-set alias references, existing IDs,
  and dangling-reference checks.
- **sdk/plugins/figma/src/audit.rs**: report unsupported units and alias targets
  with explicit reasons.
- **sdk/cli/**: expose unsupported-unit and target diagnostics and test audit output.
- **sdk/README.md**: document supported values, aliases, and remaining exclusions.

<!-- Copyright 2026 Adobe. All rights reserved. Licensed under Apache-2.0. -->
