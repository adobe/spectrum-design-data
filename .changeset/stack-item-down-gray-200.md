---
"@adobe/spectrum-design-data": patch
"@adobe/spectrum-tokens": patch
---

Correct `stack-item-selected-background-color-down` to gray-200 (discussion #1415).

- **packages/design-data/relationships/stack-item.json**: rewired selected-down
  background from gray-300 to gray-200, matching hover/key-focus — S2's down states
  don't darken further, unlike S1. Regenerated legacy `packages/tokens/src/stack-item.json`
  follows automatically.
