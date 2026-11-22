---
"@adobe/spectrum-design-data": minor
---

Bind the status light label line height per size to the px line-height tokens instead of the 1.3
ratio: 16, 18, 20 and 22 px on desktop, 20, 22, 24 and 26 px on mobile (S, M, L, XL). This matches
the Figma Web POC, React Spectrum S2 and SWC. Rendered label heights change by +0.4, -0.2, -0.8
and -1.4 px on desktop and by +0.5, -0.1, -0.7 and -2.6 px on mobile. Fixes #1756.
