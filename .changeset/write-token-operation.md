---
"design-data-core": minor
"design-data-cli": minor
---

Add `write_token` operation to sdk/core and CLI (closes #976).

- **sdk/core/src/write.rs**: new `write_token` — validates against `$schema`,
  merges into legacy JSON, records rationale in `product-context.json`.
- **sdk/core/Cargo.toml**: enable `preserve_order` on `serde_json`.
- **sdk/cli**: add `write-token` subcommand; auto-discovers schemas dir.
- Prerequisite for TUI RFC #973 M4 (wizard write path).
