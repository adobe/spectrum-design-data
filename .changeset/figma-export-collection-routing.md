---
"@adobe/spectrum-design-data": minor
---

The Figma export generator's collection routing is now file-aware instead of
purely schema-based, as plumbing for wiring up new Figma collections
(closes spectrum-design-data-11k.10.1).

- **sdk/core/src/figma/mapping.rs**: adds `TokenKind`/`CollectionSpec` and a
  `COLLECTION_SPECS` table (still 2 wildcard entries — `.Color theme` and
  `.Platform scale` — so behavior is unchanged); `resolve_collections`/
  `pick_collection` replace the two hardcoded `find_collection` calls;
  `load_all_tokens` and `build_export_payload` thread each token's source
  file through as a `(name, file, value)` triple so a future spec can route
  by file; `process_alias_token` takes its color/scale prefixes as
  parameters.
- **sdk/core/src/figma/import.rs**: `diff_values` accepts the same 3-tuple
  token shape.
- **sdk/cli/src/main.rs**: manifest-cascade export and `figma diff` build
  the 3-tuple token list, including each token's file.
