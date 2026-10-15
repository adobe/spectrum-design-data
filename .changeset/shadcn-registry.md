---
"@adobe/design-data-tui": minor
---

Add shadcn registry exports for Spectrum tokens and component metadata.

- **design-data-tui**: add `export --format shadcn-theme` for light/dark
  `registry:theme` output. Light and dark values resolve per scheme, and
  keys are unprefixed (`spectrum-*`) so shadcn emits valid `var()` references.
- **design-data-tui**: add a `shadcn registry` subcommand that writes
  metadata-only `registry:component` items and a `registry.json` index.
