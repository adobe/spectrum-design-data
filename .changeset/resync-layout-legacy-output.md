---
"@adobe/spectrum-tokens": patch
---

Regenerate legacy layout output after the design-request corrections in #1503.

- **packages/tokens/src/layout.json**: restore the banner-/list- deprecation and
  `renamed` pointers for the generic gap and padding tokens.
- **packages/tokens/src/side-navigation.json**: point `side-navigation-item-to-item`
  at `list-gap-regular`.

<!-- Copyright 2026 Adobe. All rights reserved. -->
