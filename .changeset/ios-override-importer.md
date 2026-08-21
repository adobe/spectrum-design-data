---
"@adobe/design-data-tui": patch
"@adobe/design-data-wasm": patch
---

Expose legacy-name decomposition for platform-manifest tooling (closes h890.8).

- **sdk/cli/src/main.rs**: new `decompose-legacy-name` subcommand (exposes
  `naming::parse_legacy_name`/`roundtrips`) and `dump-legacy-keys` subcommand
  (exposes `naming::extract_legacy_key` per token, undeduped) so external
  importers can resolve legacy slugs without reimplementing the algorithm.
