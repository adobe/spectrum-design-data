# packages/design-data

<!-- Copyright 2026 Adobe. All rights reserved. -->

This package is the canonical source of design token data consumed by the SDK and MCP.

## Layout

```
packages/design-data/
  tokens/          — individual token JSON files (the primary data source)
  components/      — component-level token grouping JSON
  fields/          — field definition JSON
  mode-sets/       — mode set JSON (scales, color schemes)
  registry/        — registry entries (generates core/src/registry_data.rs via codegen)
```

## MCP Environment

The `design-data` MCP server (`.mcp.json`) points here:

* `DESIGN_DATA_PATH=packages/design-data/tokens`
* `DESIGN_DATA_COMPONENTS=packages/design-data-spec/components`

When adding or renaming token files, update the MCP env if the path changes.

## Tasks

```bash
moon run design-data:test    # AVA tests for the Node utilities in this package
```

## Key Relationships

* `sdk/core` embeds data from `packages/tokens/src/*.json` and
  `packages/design-data/{mode-sets,components,fields}/*.json` at compile time.
  After editing JSON here, run `moon run sdk:codegen-check` to verify the Rust side is in sync.
* `packages/design-data-spec` validates schemas against the token JSON in this package.
* The `design-data` MCP (`tools/design-data-agent-mcp/`) reads from `tokens/` at runtime.
