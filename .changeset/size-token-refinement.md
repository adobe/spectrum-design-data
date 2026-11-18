---
"@adobe/spectrum-design-data": minor
"@adobe/spectrum-tokens": minor
"@adobe/design-data-wasm": patch
---

Refine size tokens per the Size semantic tokens RFC (SDS-16264, SDS-16083).

- **New shared tokens**: 149 added (`banner-*`, `base-*`, `container-*`, `size-*`, `field-width-*`).
- **Deprecations**: 243 deprecated, 17 with no replacement; 45 computed or platform tokens stay.
- **Calculated sizing**: 6 replacements are calculated (input height x 4, media width / ratio).
- **Mobile**: 59 shared tokens get a mobile value (x 1.25, half up); 4 widths keep their S2
  mobile values. 10 component tokens stay active at their S2 sizes: 3 color controls, 7 color
  area, wheel and handle sizes (x 1.25 on mobile).
- **Width exceptions**: `illustrated-message-vertical-maximum-width` is 352px,
  `card-minimum-width-large` is 288px, and both dialog minimum widths stay 288px,
  on desktop and mobile.
- **Divider**: size L is 4px desktop and 5px mobile, following `bar-thickness-small`.
- **Value changes**: `field-width-*` names return at 144/192/240/288px; dividers 200px to 16px.
- **Tooltip tip**: 4x8px desktop, 5x10px mobile.
- **Relationships**: 561 repointed to shared tokens, 24 duplicates removed.
- **visuals/accordion.json**: size M preview width uses `field-width-large`.
- **design-data-wasm**: rebuilt so the embedded dataset has these changes.

<!-- Copyright 2026 Adobe. All rights reserved. -->
