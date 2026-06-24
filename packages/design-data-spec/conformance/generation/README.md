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

## Running

```bash
design-data migrate legacy-output --output <out-dir> <input-dir>/
diff <out-dir>/tokens.json expected/tokens.json
```

Byte-identical output with no diff = conformance. Run twice to verify determinism.

## Cascade grouping fields (`set_uuid` / `set_schema`)

The `mode-set-token` fixture input uses two cascade-internal grouping fields:

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
