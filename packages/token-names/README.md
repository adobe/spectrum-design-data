# [**@adobe/token-names**](https://github.com/adobe/token-names)

Sidecar taxonomy data for Spectrum design tokens. Stores structured `name`
objects for tokens in `@adobe/spectrum-tokens`, **decoupled** from the published
token package so taxonomy changes don't bump `@adobe/spectrum-tokens`.

This package is **private** — it is not published to npm. Delivery format for
downstream consumers is TBD.

## Format

Each file under `names/` mirrors a source file in `packages/tokens/src/` and is
a plain JSON object mapping token slug → name object:

```json
{
  "blue-100": { "property": "color", "colorFamily": "blue", "scaleIndex": 100 },
  "icon-color-blue-primary-default": {
    "property": "icon-color", "colorFamily": "blue", "variant": "primary"
  }
}
```

Fields are defined in `packages/design-data/fields/`.

## Using with the SDK validator

Pass `--names-dir packages/token-names/names/` to the `design-data validate`
CLI so the SDK merges name objects at ingest:

```bash
cargo run --bin design-data --manifest-path sdk/Cargo.toml -- \
  validate packages/tokens/src/ \
  --names-dir packages/token-names/names/
```

## Regenerating name data

Name objects are produced by `@adobe/token-corpus-migrate`:

```bash
# Dry-run: see what would be written to names/
node tools/token-corpus-migrate/src/cli.js \
  --root packages/tokens/src \
  --names-out packages/token-names/names

# Apply
node tools/token-corpus-migrate/src/cli.js \
  --root packages/tokens/src \
  --names-out packages/token-names/names \
  --write
```

## Validating coverage

```bash
node packages/token-names/scripts/check-coverage.mjs
# or
moon run token-names:check
```

The script asserts every key in `names/*.json` corresponds to an actual token
in `@adobe/spectrum-tokens` — catching orphan entries after token renames.

## Tests

```bash
pnpm test   # from packages/token-names/
# or
moon run token-names:test
```
