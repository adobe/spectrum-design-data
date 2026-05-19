# token-corpus-migrate

CLI tool that injects structured `name` objects into Spectrum token source files.
Run it as a one-shot transform when extending the corpus to use new taxonomy fields
(see `packages/design-data-spec/spec/taxonomy.md`).

## Usage

```bash
# Dry-run (default) — report what would change, no files written
node tools/token-corpus-migrate/src/cli.js --root packages/tokens/src

# Apply changes to disk
node tools/token-corpus-migrate/src/cli.js --root packages/tokens/src --write

# Save the report to a file
node tools/token-corpus-migrate/src/cli.js --root packages/tokens/src --report /tmp/migrate.md
```

## Pilot scope

By default the tool processes only the files declared in `PILOT_FILES` (currently
`color-palette.json`, `typography.json`, and `icons.json`). Pass `--all` to
process every `*.tokens.json` file under `--root`.

## How classification works

Each token is matched against the rules in `src/transform.js`:

| Token `$schema`                 | Key pattern                             | Resulting `name`                                                       |
| ------------------------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| `color.json` / `color-set.json` | `<family>-<N>`                          | `{ property: "color", colorFamily, scaleIndex }`                       |
| `color.json` / `color-set.json` | bare family id                          | `{ property: "color", colorFamily }`                                   |
| `font-family.json`              | `<family>-font-family`                  | `{ property: "font-family", family }`                                  |
| `font-style.json`               | `<style>-font-style`                    | `{ property: "font-style", style }`                                    |
| `font-style.json`               | any key with `value: "normal"`          | `{ property: "font-style", style: "normal" }`                          |
| `font-weight.json`              | `<weight>-font-weight`                  | `{ property: "font-weight", weight }`                                  |
| `scale-set.json`                | `font-size-<N>`                         | `{ property: "font-size", scaleIndex }`                                |
| `scale-set.json`                | `line-height-font-size-<N>`             | `{ property: "line-height", scaleIndex }`                              |
| `color-set.json`                | `icon-color-<family>-background`        | `{ property: "icon-color", colorFamily, object: "background" }`        |
| `color-set.json`                | `icon-color-<family>-primary[-<state>]` | `{ property: "icon-color", colorFamily, variant: "primary"[, state] }` |
| `alignment.json`                | `text-align-<alignment>`                | `{ property: "text-align", alignment }`                                |
| `dimension.json`                | `letter-spacing` (exact)                | `{ property: "letter-spacing" }`                                       |

Valid `colorFamily` values are sourced from `@adobe/design-system-registry/registry/color-families.json`.
Valid `alignment` values are sourced from `@adobe/design-system-registry/registry/alignments.json`.
Valid `family` values are sourced from `@adobe/design-system-registry/registry/typography-families.json`.
Valid `style` values are sourced from `@adobe/design-system-registry/registry/typography-styles.json`.
Valid `weight` values are sourced from `@adobe/design-system-registry/registry/typography-weights.json`.
Tokens that already have a `name` field are skipped.
Alias tokens and other out-of-scope schemas are left untouched.

## Handling unclassified tokens

If a token's `$schema` is in scope but the key doesn't match any rule, the
dry-run report lists it under **Unclassified**. Add it to `src/overrides.json`:

```json
{
  "overrides": {
    "my-special-token": { "name": { "property": "color", "colorFamily": "gray" } }
  }
}
```

Re-run the dry-run to confirm the override resolves the entry, then apply with `--write`.

## Tests

```bash
pnpm test   # from tools/token-corpus-migrate/
```

or

```bash
moon run token-corpus-migrate:test
```

## Extending for new domains

To add a new domain (e.g. motion):

1. Add a new classification function in `src/transform.js` (see `fontWeightNameForKey`
   as a template).
2. Add the schema suffix and the new function call inside `classifyToken`.
3. Add unit tests in `test/transform.test.js`.
4. Add the new token file name to `PILOT_FILES` in `src/cli.js` if appropriate.
