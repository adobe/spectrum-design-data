---
"@adobe/design-data-wasm": minor
---

Extract portable domain logic from cli/tui/wasm into core; fix wasm resolve bug.

- **wasm Dataset::resolve()**: delegates to `cascade::resolve_property`, fixing a
  latent bug where Platform-layer overrides did not beat Foundation tokens.
- **core::authoring::draft**: `derive_token_key_from_parts` unifies TUI and MCP key
  assembly under one rule and fallback.
- **core::component** (new): `validate_id`, `lookup`, `list` for disk-backed
  component lookup; feeds MCP `describe_component`.
- **core::write**: `build_product_context_doc`, `merge_product_context_rationale`,
  `layer_target_filename`.
- **core::cascade**: `parse_resolve_context`, `apply_restrictions`.
- **core::graph**: `TokenGraph::infer_schema_url`.
- **core::query**: `subsequence_score` (from TUI fuzzy.rs).
- **core::validate**: `validate_catalog_dir`, `validate_catalog_schemas`.
- **core::figma::mapping**: `summarize_variables`, `CollectionSummary`.
