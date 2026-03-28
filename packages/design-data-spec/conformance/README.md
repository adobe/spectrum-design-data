# Conformance fixtures (Layer 3)

Each **invalid** case lives under `invalid/<RULE_ID>/` with:

* One or more JSON **fixture** files (structurally valid for Layer 1 when targeting Layer 2 rules).
* **`expected-errors.json`** — expected diagnostics after Layer 2 validation (see `errors[].rule_id`, `severity`, optional `message_pattern`).

**Valid** baselines live under `valid/`.

| Folder             | Rule     | Intent                                                  |
| ------------------ | -------- | ------------------------------------------------------- |
| `invalid/SPEC-001` | SPEC-001 | Alias target does not exist.                            |
| `invalid/SPEC-002` | SPEC-002 | Alias resolves to incompatible type (semantic).         |
| `invalid/SPEC-003` | SPEC-003 | Circular alias chain.                                   |
| `invalid/SPEC-004` | SPEC-004 | Duplicate `uuid` across tokens.                         |
| `invalid/SPEC-005` | SPEC-005 | Dimension `default` not in `modes`.                     |
| `invalid/SPEC-006` | SPEC-006 | Ambiguous resolution / specificity tie (warning).       |
| `invalid/SPEC-008` | SPEC-008 | Non-default mode variants with no base/default variant. |

Implementors SHOULD run these fixtures once the Rust validator exposes rule IDs ([#724](https://github.com/adobe/spectrum-design-data/issues/724), [#725](https://github.com/adobe/spectrum-design-data/issues/725)).

***

## Resolution conformance fixtures

Each **resolution** case lives under `resolution/<name>/` with:

* `input/` — cascade-format `.tokens.json` files
* `dimensions/` — (optional) dimension declaration JSON files
* `query.json` — `{ "property": "...", "context": { ... } }` — the resolution query
* `expected.json` — `{ "resolved": bool, "expected_uuid": "..." }` — expected outcome

| Folder                                    | Intent                                                               |
| ----------------------------------------- | -------------------------------------------------------------------- |
| `resolution/base-fallback`                | Dimensionless base token MUST match any context (wildcard behavior). |
| `resolution/specificity-wins`             | Higher-specificity variant MUST win over base when both match.       |
| `resolution/alias-resolved-after-cascade` | Cascade selects the winner first; alias `$ref` chain resolves after. |

The Rust SDK drives these fixtures in `sdk/core/src/lib.rs` (`resolution_conformance` module, closes [#768](https://github.com/adobe/spectrum-design-data/issues/768)).

***

## Diff conformance fixtures

Each **diff** case lives under `diff/<name>/` with:

* `old/` — old token dataset (`.tokens.json` cascade arrays or `.json` legacy format)
* `new/` — new token dataset
* `expected.json` — full `DiffReport` structure (six category arrays: renamed, deprecated, reverted, added, deleted, updated)

| Folder                                | Intent                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| `diff/identical-tokens`               | Two identical datasets MUST produce an empty diff (all arrays empty).            |
| `diff/simple-add-delete`              | One old-only token → deleted; one new-only token → added.                        |
| `diff/rename-by-uuid`                 | Same UUID, different name objects → renamed (not add + delete).                  |
| `diff/deprecated-new-token`           | Unmatched new token with `deprecated: true` → deprecated (not added).            |
| `diff/deprecated-set-level`           | All set entries `deprecated: true` normalizes to token-level deprecated.         |
| `diff/reverted-token`                 | Matched token that loses `deprecated` → reverted (not updated).                  |
| `diff/matched-gaining-deprecated`     | Matched token that gains `deprecated` → updated (not deprecated).               |
| `diff/property-value-update`          | Matched token with changed `value` → updated with property change.               |
| `diff/property-nested-change`         | Nested object change reported at leaf path (e.g. `sets.light.value`).            |
| `diff/uuid-backfill`                  | Old lacks UUID, new gains it with same name object → paired (not add + delete).  |
| `diff/cross-format`                   | Legacy old + cascade new, paired by UUID across formats.                         |
| `diff/rename-with-property-changes`   | Renamed token with additional value changes populates `property_changes`.        |

The Rust SDK drives these fixtures in `sdk/core/src/lib.rs` (`diff_conformance` module, closes [#788](https://github.com/adobe/spectrum-design-data/issues/788)).

***

## Query conformance fixtures

Each **query** case lives under `query/<name>/` with:

* `input/` — cascade-format `.tokens.json` files
* `query.txt` — plain-text filter expression
* `expected.json` — sorted array of matched token UUIDs

| Folder                        | Intent                                                                    |
| ----------------------------- | ------------------------------------------------------------------------- |
| `query/single-field`          | Basic `key=value` equality filter.                                        |
| `query/and-conditions`        | `,` (AND) requires all conditions to match.                               |
| `query/or-conditions`         | `\|` (OR) matches if any alternative matches.                             |
| `query/negation`              | `!=` matches non-equal values and absent fields.                          |
| `query/wildcard-suffix`       | Glob `*` at end of value matches prefix.                                  |
| `query/wildcard-prefix`       | Glob `*` at start of value matches suffix.                                |
| `query/empty-matches-all`     | Empty filter expression is a universal match.                             |
| `query/no-matches`            | Filter with no matching tokens returns empty result.                      |
| `query/schema-key`            | `$schema` key queries the top-level `$schema` field.                      |
| `query/and-or-precedence`     | AND binds tighter than OR: `a,b\|c` = `(a AND b) OR c`.                  |

The Rust SDK drives these fixtures in `sdk/core/src/lib.rs` (`query_conformance` module, closes [#788](https://github.com/adobe/spectrum-design-data/issues/788)).
