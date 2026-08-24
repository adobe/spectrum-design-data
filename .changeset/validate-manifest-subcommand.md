---
"@adobe/design-data-tui": minor
"@adobe/design-data-wasm": minor
---

Add a standalone `validate-manifest` CLI subcommand (closes bead spectrum-design-data-h890.5).

- **sdk/cli/src/main.rs**: new `validate-manifest [PATH] [--manifest FILE] [--format]`
  subcommand — validates a configured Layer 2 platform manifest (Layer 1 schema shape +
  apply-time cascade checks) with CI-friendly exit codes, without running a query.
- **sdk/core/src/data_source/mod.rs**: `CliPathOverrides` gains a `platform_manifest`
  override so the manifest can be supplied on the command line, winning over the
  `.design-data.toml` `manifest` key.
