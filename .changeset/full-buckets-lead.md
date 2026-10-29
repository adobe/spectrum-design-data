---
"@adobe/spectrum-design-data": major
"@adobe/spectrum-tokens": major
---

Refine size tokens and remove the medium suffix from shared banner tokens.

<!-- Copyright 2026 Adobe. All rights reserved. -->

- **tokens/layout.tokens.json**: Add 2x-small width, update size aliases, and rename banner tokens.
- **tokens/layout-component.tokens.json**: Alias the list item minimum height to size-600 (40px).
- **relationships/card.json**: Correct the extra-small, large, and extra-large width mappings.
- **relationships/tooltip.json**: Map the maximum width to the 2x-small container maximum width.
- **relationships/color-wheel.json**: Map the minimum width to size-1200.
- **relationships/illustrated-message.json**: Correct horizontal and vertical width mappings.
- **relationships/alert-banner.json**: Map the minimum height to banner-minimum-height.
- **relationships/action-bar.json**, **relationships/toast.json**: Update banner-height guidance.
- **packages/tokens/src/**: Regenerate legacy aliases, names, and replacement mappings.
- **packages/tokens/test/sizeRefinements.test.js**: Cover canonical and legacy data.
