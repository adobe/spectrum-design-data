---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Remove 17 misfiled `Step text` and `Step visual` records from the action-bar
relationships. Each `$ref` already has a record in `steplist.json` with the
proper `label`, `visual` or `track` part. The records had no legacy key and
nothing referenced them, so the legacy `@adobe/spectrum-tokens` output is
byte-identical. Action-bar now reads L2 (was L1). The embedded relationships
change, hence the wasm patch.
