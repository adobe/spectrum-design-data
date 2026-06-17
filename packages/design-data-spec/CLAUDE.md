# packages/design-data-spec

<!-- Copyright 2026 Adobe. All rights reserved. -->

This package defines and validates the component specification schemas for the design system.

## Layout

```
packages/design-data-spec/
  components/      — per-component JSON spec files (consumed by the MCP server)
  schemas/         — JSON Schema definitions for spec validation
  src/             — validation logic and utilities
  test/            — AVA tests
```

## Tasks

```bash
moon run design-data-spec:test
# or directly:
pnpm --filter @adobe/design-data-spec test
```

## Key Relationships

* `DESIGN_DATA_COMPONENTS` in the MCP env points to `components/` here.
* The `design-data` MCP `describe_component` tool reads files from this directory.
* Component JSON files must conform to the JSON schemas in `schemas/`.
* Changes to schemas require updating any existing component files that are affected.

## Validation

Run the AVA tests to confirm all component files pass schema validation.
When adding a new component spec:

1. Create `components/<component-name>.json`
2. Ensure it validates against `schemas/component.schema.json`
3. Add a test case in `test/` if the component has unusual shape
