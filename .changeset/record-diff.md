---
"@adobe/design-data-wasm": minor
---

feat(core): record-level diff between two dataset revisions (hzje.3)

`record_diff::diff_datasets` compares two dataset snapshots record by record: tokens through the
existing semantic diff (spec/diff.md), relationships matched by uuid (then scope, context and
target; a re-pointed binding is one update), component options, option values, anatomy parts,
states, slots, document blocks, implementations and lifecycle, and visual recipes. Formatting and
key order never produce a change. Tokens whose alias-resolved value moved are reported
separately, so callers can mark them indirect.
