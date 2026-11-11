---
"@adobe/spectrum-design-data": patch
"@adobe/spectrum-tokens": patch
"@adobe/design-data-wasm": patch
---

Repoint 245 component relationships from deprecated size tokens to their shared replacements.

Desktop values are unchanged. Mobile records that pointed at retired mobile-scale tokens now use the single shared value, which equals the desktop value (for example action-button height 26px to 20px on mobile). Relationships whose replacement value differs on desktop, and those without a replacement, still point at the deprecated token.

<!-- Copyright 2026 Adobe. All rights reserved. -->
