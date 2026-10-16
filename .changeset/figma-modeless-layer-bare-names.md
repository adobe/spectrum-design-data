---
"@adobe/design-data-tui": minor
---

Figma export derives collection specs from mode sets and gains opt-in flags (cn3v.3, .4, .7).

- **sdk/plugins/figma**: specs come from `graph.mode_sets`; variables match per collection.
- **sdk/cli**: `figma export --modeless-layer` writes a modeless alias layer.
- **sdk/cli**: `figma export|audit|diff --no-folder-prefix` use bare token names.
