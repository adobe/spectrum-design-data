---
"@adobe/spectrum-tokens": minor
"@adobe/design-system-registry": minor
"@adobe/design-data-spec": minor
---

Typography stragglers: structured `name` on text-align and letter-spacing tokens.

- **typography.json**: 4 tokens gain `name` — 3 `text-align-*` and 1 bare
  `letter-spacing`.
- **design-system-registry**: add `text-align` to `property-terms.json`;
  new `alignments.json` registry (start/center/end); regenerate `registry_data.rs`.
- **design-data-spec**: new `alignment` spec field; `taxonomy.md` updated.
- **token-corpus-migrate**: add `alignmentNameForKey`, `letterSpacingNameForKey`,
  `lineHeightMultiplierNameForKey` (exported for future use); extend dispatch.
- Line-height multipliers and CJK line-height deferred — SPEC-006 collision
  and SPEC-042 constraint; follow-ups tracked in beads.
