---
"@adobe/design-data-tui": minor
---

Figma export derives collection specs from mode sets and gains opt-in flags (closes cn3v.3, cn3v.4, cn3v.7).

- **sdk/plugins/figma**: collection specs come from `graph.mode_sets`; existing variables are matched per collection, so bare names can't update a same-named variable elsewhere.
- **sdk/cli**: `figma export --modeless-layer` writes a modeless alias layer into the "Spectrum" collection.
- **sdk/cli**: `figma export|audit|diff --no-folder-prefix` use bare token names instead of `colorTheme/`/`platformScale/`.
