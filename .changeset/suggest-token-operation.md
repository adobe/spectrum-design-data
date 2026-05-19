---
"design-data-core": minor
"design-data-cli": minor
---

Add `suggest_token` operation to sdk/core and CLI (closes #975).

- **sdk/core/src/suggest.rs**: new `suggest` function — ranks existing tokens
  against a natural-language intent string using Jaccard similarity over
  key segments and name-object fields. Supports a `property_hint` filter.
- **sdk/core/src/lib.rs**: expose `pub mod suggest`.
- **sdk/cli/src/main.rs**: add `suggest` subcommand with `--property` hint,
  `--limit`, and `--format` flags.
- Prerequisite for TUI RFC #973 Screen 1 "reuse first" wizard banner.
