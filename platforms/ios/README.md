<!-- Copyright 2026 Adobe. All rights reserved. -->

# iOS platform manifest

This is an incubating proof of concept, not a production iOS implementation
or an iOS-team adoption commitment. Monorepo maintainers steward the data until
an implementation team is ready to own it.

Author iOS manifest data in this directory. The Swift demo and historical
findings remain in the consumer-only
[`GarthDB/spectrum-ios-design-data`](https://github.com/GarthDB/spectrum-ios-design-data).
That repository pins the foundation and this manifest to an immutable monorepo
commit and builds the CLI from the same commit. It has no writable manifest or
extensions. Update its pins deliberately after verifying its Swift demo.

## Source and attribution

The manifest and six extension files are a snapshot of
[`GarthDB/spectrum-ios-design-data@8687fc911339c6eb3ce8abe74410d224b0ab4f82`](https://github.com/GarthDB/spectrum-ios-design-data/tree/8687fc911339c6eb3ce8abe74410d224b0ab4f82),
maintained by Garth Braithwaite. The source repository retains its Git history
and contributor attribution; this import does not merge unrelated histories.
The data retains its Apache-2.0 license under this repository's
[`LICENSE`](../../LICENSE). Copyright 2026 Adobe. All rights reserved.

All extension data is unchanged from that snapshot, including the 1,118
imported token records, tab-bar component and guidance, relationship, and
iOS state and contrast crosswalks. The manifest adds `platform` and `repository`
identity fields and targets foundation `3.6.0` after the consumer compatibility
decision (`spectrum-design-data-h890.34`). It preserves the filters, three
UUID-targeted teal overrides, formatting, and naming exceptions.
Repository formatting may differ from the source; JSON content and record order
are preserved.

The one-time `tools/ios-override-importer` produced the original token import.
It is not a supported writer for this directory: it reconstructs manifest
fields and does not preserve all identity metadata. Do not rerun it over this
manifest to maintain the data.

## Select and validate

From the monorepo:

```bash
design-data validate-manifest --platform ios
design-data query --platform ios --filter 'component=tab-bar-ios' --format json
design-data platform show ios
moon run root:validate-platforms
```

The root config has no default platform. Commands without platform selection
continue to use the foundation alone. For the authoring MCP, select this local
profile with `DESIGN_DATA_PLATFORM=ios` and point `DESIGN_DATA_CONFIG` at the
monorepo's `.design-data.toml`.

## Foundation compatibility and handoff

The original snapshot targeted `@adobe/spectrum-tokens@15.4.0`. That release's
manifest schema rejects the added `platform` and `repository` fields. The
consumer cutover deliberately updates the target to foundation `3.6.0` and
pins both data sources to a compatible monorepo commit instead of that release.
The imported token data is unchanged.

The `high` to `increased` crosswalk targets the `contrast` mode set. Consumers
need a CLI with mode-set terminology crosswalk support; registry-only
validation rejects it. Build the demo's CLI from its pinned monorepo commit
until a published CLI includes that support.

`foundationVersion` is compatibility metadata, not source selection. Local
commands use this checkout's foundation. Verify remote consumption in the
demo repository when changing its source pin; local validation alone does
not prove compatibility.

When an iOS implementation team accepts ownership, use the
[migration runbook](../../docs/MIGRATION.md) to move the manifest to its
repository and update the named profile. Keep one writable data source.
