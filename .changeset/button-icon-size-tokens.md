---
"@adobe/spectrum-design-data": patch
---

Button icon sizes now use the live `workflow-icon-small/medium/large/extra-large` tokens.

The Button Icon relationships pointed at the deprecated `workflow-icon-size-75..300` tokens,
which gave 16/20/22/26 px on desktop. Figma, React Spectrum S2 and Spectrum Web Components all
use 16/18/20/22 px. Mobile values are unchanged (18/24/28/30 px).
