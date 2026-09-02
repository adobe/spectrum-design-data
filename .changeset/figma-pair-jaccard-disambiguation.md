---
"@adobe/spectrum-design-data": minor
---

`figma pair` resolves nearly all remaining `S2.Color-theme` value collisions
instead of leaving them ambiguous (closes spectrum-design-data-11k.10.6).

- **sdk/core/src/figma/import.rs**: replace `figma_path_score`'s
  cascade-field matching with `figma_name_similarity`, a Jaccard word-overlap
  score between a Figma path and the design-data key itself — the words that
  actually carry semantic identity (e.g. `notice`, `key-focus`) live in the
  key, not its raw cascade fields. Cuts ambiguous collisions from 321 to 5.
- **sdk/core/src/figma/import.rs**: `pair_by_value` now demotes any
  legacy_key chosen by more than one Figma variable back to ambiguous,
  since a mapping artifact can only hold one figmaName per key.
- **sdk/core/tests/fixtures/figma/s2-color-theme.mapping.json**: new curated
  `--mapping` artifact (323 entries) for `figma diff`/`figma export`,
  covering the resolved collisions plus one hand-picked true tie.
