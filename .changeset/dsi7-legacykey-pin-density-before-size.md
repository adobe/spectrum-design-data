---
"@adobe/spectrum-design-data": patch
---

Pin `name.legacyKey` on the untracked density-before-size residual flagged
by dsi.7, following the dsi.3 precedent (preserve published legacy names
via the escape hatch rather than reordering the serializer or renaming
tokens).

- **packages/design-data/tokens/layout-component.tokens.json**: pinned
  `legacyKey` on 49 `accordion`/`card` tokens (34 distinct property
  strings) whose property fuses a relation, density, and size in
  size-incompatible order (e.g. `bottom-to-text-compact-large`); resolved
  from `packages/tokens/src/layout-component.json` by uuid match, not by
  string reconstruction, per the lesson from dsi.3's initial mis-pin.
