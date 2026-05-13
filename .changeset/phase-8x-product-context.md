---
"@adobe/design-data-spec": minor
---

Phase 8.x: product context document

- New spec chapter `spec/product-context.md` — defines the Layer 3 product context document:
  rationale, overrides, extensions, and agent capture behavior.
- New schema `schemas/product-context.schema.json` — validates product-context.json documents.
- `spec/cascade.md` — note on product context in the layers table.
- `spec/manifest.md` — cross-reference to product context.
- `spec/agent-surface.md` — add `write_token` and `write_component` to tool catalog (RECOMMENDED);
  note on rationale capture behavior.
- `spec/index.md` — add product context to normative references.
- `design-data write` CLI subcommand — creates or updates a product-context.json file; accepts
  `--output` (path) and `--rationale` (text) flags.
