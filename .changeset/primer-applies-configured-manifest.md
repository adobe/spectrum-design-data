---
"@adobe/design-data-tui": patch
"@adobe/design-data-wasm": patch
---

Primer now applies the configured platform manifest cascade (closes bead .22.4 verification gap).

- **sdk/cli/src/main.rs**: `run_primer` calls `manifest::apply_configured`, so a configured
  manifest's `extensions.components`/`platformExtensions` surface in primer output.
