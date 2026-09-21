---
"@adobe/design-data-tui": minor
---

Extract Figma and DTCG into plugin crates and add a `TokenExporter` trait (closes #1484).

- **sdk/core**: adds `export::TokenExporter`, the compiled-in seam for pure graph -> document
  exporters, and widens `suggest::tokenize`, `TokenGraph::has_relationship_record`, and
  `TokenGraph::resolve_alias_in_context` to `pub` so the new plugin crates can use them.
