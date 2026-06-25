# Generation conformance fixtures

Each case pairs a cascade-format input with the expected byte-identical legacy set-format output
produced by the output generator. These fixtures verify the determinism contract in
[Evolution — Legacy format contract](../../spec/evolution.md#legacy-format-contract).

## Structure

```
generation/<case>/
  input/    — cascade-format *.tokens.json files (array-of-objects)
  expected/ — expected legacy output (keyed-object format, one file per input file)
```

## Automated driver

These fixtures are exercised automatically by the `generation_conformance` module in
`sdk/core/src/lib.rs`. Each test case runs `legacy::convert_dir` twice and asserts:

1. **Byte-identical output** — the generated files match `expected/` exactly.
2. **Determinism** — pass 1 and pass 2 output are identical.

```bash
# Run all generation conformance tests:
moon run sdk:test
# or directly:
cd sdk && cargo test generation_conformance
```

To regenerate `expected/` after changing conversion logic, run the CLI and commit the result:

```bash
design-data migrate legacy-output <case>/input --output <case>/expected
```

## Cases

| Case               | What it exercises                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `flat-token`       | Basic flat token conversion (property key derivation, field passthrough)                                    |
| `mode-set-token`   | Color-set reconstruction from per-mode cascade records (`set_uuid`/`set_schema`)                            |
| `deprecated-token` | `deprecated: "version"` string → `true` boolean; `deprecated_comment` passthrough; `plannedRemoval` dropped |
| `renamed-token`    | `replaced_by: "<uuid>"` → `renamed: "<property-name>"` via global UUID→name map                             |
| `alias-rewire`     | `$ref: "<uuid>"` → `value: "{<property-name>}"` (alias denormalization with UUID resolution)                |
| `mode-set-edit`    | `deprecated`/`renamed` hoisted to outer set level when consistent across all mode entries                   |

## Cascade grouping fields (`set_uuid` / `set_schema`)

The `mode-set-token` and `mode-set-edit` fixtures use two cascade-internal grouping fields:

| Field        | Type   | Role                                                                                                                                                                                                                                                                             |
| ------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `set_uuid`   | string | Shared UUID that groups per-mode cascade records into one set-keyed legacy entry. The SDK registers this as `set_uuid → child-key list` in `sdk/core/src/graph.rs` and the legacy generator collapses all records sharing a `set_uuid` into a single `sets`-keyed output object. |
| `set_schema` | string | The `$schema` URI of the aggregate set token emitted at the outer (non-mode-keyed) level in the legacy output (e.g. `color-set.json`).                                                                                                                                           |

These fields are not yet in the normative token-format field table — they are Rust SDK
implementation fields defined in `sdk/core/src/graph.rs` and emitted by the cascade ingest
pipeline (`sdk/core/src/cascade.rs`). A future spec update will add them to
`spec/token-format.md` as normative cascade fields. Until then, implementors of the output
generator MUST read the SDK implementation as the reference and treat these fixtures as
illustrative of the expected grouping behavior.
