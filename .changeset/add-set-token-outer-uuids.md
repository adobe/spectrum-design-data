---
"@adobe/spectrum-tokens": minor
---

Add outer-level UUIDs to all set tokens (color-set, scale-set) that were missing
them. 1235 tokens across all source files now have a token-level UUID in addition
to their per-mode UUIDs. The `color-set.json` and `scale-set.json` schemas now
require an outer `uuid` field.

This is an additive change — token values and names are unchanged. Consumers who
read the raw JSON will see a new `uuid` field at the top level of set token entries
in `variables.json`.
