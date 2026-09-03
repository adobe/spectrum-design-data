---
"@adobe/design-data": patch
"@adobe/spectrum-tokens": patch
---

Fix `stack-item-selected-background-color-down` aliasing the wrong gray palette step.

- **packages/design-data/relationships/stack-item.json**: `$ref` corrected from
  gray-300's set to gray-200's set, matching Figma across all three color-theme modes.
- **packages/tokens/src/stack-item.json**: same alias corrected from `{gray-300}`
  to `{gray-200}`.
