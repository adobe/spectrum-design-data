---
"@adobe/design-data-spec": patch
"@adobe/design-data-wasm": patch
---

A platform manifest override now keeps every field of the record it replaces.

**Spec:**

- `manifest.md` `overrides` now says what the code already did: the override replaces the
  foundation record for that platform's graph (same key and uuid).
- `query` returns one record per token.
- Defines the in-memory markers `overriddenBy` and `overriddenFrom`. Legacy output omits them.

**Core and WASM:**

- An override no longer drops `$schema`, `$valueType`, `lifecycle`, `description` or
  `conceptId`. It changes only `value` or `$ref`.
- A replaced record carries `overriddenBy` (`{platform}` or `{manifest}`) and
  `overriddenFrom` (the foundation value, kept even after several overrides).
- Output with no platform is unchanged. With the iOS manifest, the three teal overrides
  now keep their `$schema`, `uuid` and `private` fields.
