---
"@adobe/spectrum-design-data": minor
---

Register color-handle, color-loupe components and color-area anatomy term.

- **packages/design-data/registry/components.json**: Add `color-handle` and
  `color-loupe` entries backing existing refs in `color-component.tokens.json`.
- **packages/design-data/registry/anatomy-terms.json**: Add `color-area`
  anatomy term for the embedded gradient surface in color-wheel and relatives.
- **sdk/core/src/registry_data.rs**: Regenerated via `sdk:codegen` to include
  all three new entries.
