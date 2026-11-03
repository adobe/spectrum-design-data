---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

fix(design-data): give every relationship record a stable uuid

4,857 relationship records had no `uuid`. Each now has a deterministic UUIDv5 from
`scripts/backfill-relationship-uuid.mjs`. Existing uuids are unchanged. Changelogs and
platform overrides can now target any relationship. Legacy output is unchanged.
