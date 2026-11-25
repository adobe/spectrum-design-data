---
"@adobe/design-data-spec": patch
"@adobe/design-data-wasm": patch
---

SPEC-092 no longer flags a live relationship record that has a `legacyKey`. The legacy token name
addresses it, so it needs no `context` or contexted referrer. Deprecated records stay exempt. The
CLI check and the embedded `Dataset.validate()` output change with it (no CLI version bump).
