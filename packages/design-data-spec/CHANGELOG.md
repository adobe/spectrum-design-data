# @adobe/design-data-spec

## 0.2.0

### Minor Changes

- [#817](https://github.com/adobe/spectrum-design-data/pull/817) [`1b25001`](https://github.com/adobe/spectrum-design-data/commit/1b250013b34cca696b5fd1c0920e8cc0a677af0b) Thanks [@GarthDB](https://github.com/GarthDB)! - Add composite token support (Proposal 010). Introduces a `$valueType` field for
  declaring a token's value-type schema. Defines three composite value-type schemas
  (`typography`, `drop-shadow`, `typography-scale`) under `schemas/value-types/`.
  Adds inline alias reference rules and three new validation rules (SPEC-014,
  SPEC-015, SPEC-016). No breaking changes — `$valueType` is optional.

- [#820](https://github.com/adobe/spectrum-design-data/pull/820) [`ea25053`](https://github.com/adobe/spectrum-design-data/commit/ea250531a9222467b29a45d1d1cff2123fe97b50) Thanks [@GarthDB](https://github.com/GarthDB)! - Add string-name escape hatch (Proposal 012). Allows a token's `name` to be
  a plain string when the structured taxonomy cannot express it. String-named
  tokens are schema-valid but trigger SPEC-017 (severity: warning,
  category: tech-debt), making tech debt visible and trackable. No breaking
  changes — all existing name-object tokens are unaffected.

## 0.1.0

### Minor Changes

- [#810](https://github.com/adobe/spectrum-design-data/pull/810) [`4a55a5f`](https://github.com/adobe/spectrum-design-data/commit/4a55a5f2b027d7df73852cb62dd633bd5da17c93) Thanks [@GarthDB](https://github.com/GarthDB)! - Add taxonomy registries and expand token name object schema.
  - Split `anatomy-terms.json`: removed styling surfaces and positional terms
  - Added `token-objects.json` (background, border, edge, visual, content)
  - Added 6 new taxonomy registries:
    structures, substructures, orientations, positions, densities, shapes
  - Exported all 7 new registries from package index
  - Added all 13 semantic fields explicitly to `nameObject` in
    `token.schema.json`, distinguishing semantic from dimension fields

## 0.0.1

### Patch Changes

- [#738](https://github.com/adobe/spectrum-design-data/pull/738) [`880b365`](https://github.com/adobe/spectrum-design-data/commit/880b3650c297612b25d1b9ee1a01aa49abbacdd7) Thanks [@GarthDB](https://github.com/GarthDB)! - Add draft Design Data Specification prose (`1.0.0-draft`), v0 JSON Schemas,
  validation rule catalog (SPEC-001–SPEC-006), and conformance fixtures.
