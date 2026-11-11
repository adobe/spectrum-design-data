---
"@adobe/spectrum-design-data": patch
"@adobe/spectrum-tokens": patch
"@adobe/design-data-wasm": patch
---

Repoint 554 component relationships from deprecated size tokens to their shared
replacements (RFC: Size semantic tokens refinement, SDS-16264).

Values follow the shared scales, so some sizes change: field widths become
144/192/240/288px, control sizes 12 to 20px, and the divider minimums 200px to
16px. Mobile records that pointed at retired mobile-scale tokens now use the
single shared value.

Relationships whose token has no replacement (computed or platform-specific
sizes) still point at the deprecated token.

<!-- Copyright 2026 Adobe. All rights reserved. -->
