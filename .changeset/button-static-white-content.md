---
"@adobe/spectrum-design-data": patch
---

Button accent and negative label and icon colours are now static white in both colour schemes.

The relationships bound them to `gray-25`, which turns near-black in dark mode. The
Figma Web POC binds `Palette/white` and React Spectrum S2 renders white.

- Accent/negative Label and Icon now reference `transparent-static-white-1000`.
- The dark-mode duplicates of those two relationships are removed.
- The `gray-25` Label and Icon relationships now apply to the primary variant only.
