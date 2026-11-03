---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Accordion data: add anatomy, an `isOpen` option and Figma-aligned padding relationships.

- **components**: `accordion` gains anatomy (item, header, disclosure-icon, title, content,
  divider) and a boolean `isOpen` option.
- **relationships**: relabel the eight `S` contexts as top/bottom edge to text, drop 54 exact
  duplicate records, and add header, title and content padding relationships by size,
  density and scale that bind the semantic tokens Figma uses.
