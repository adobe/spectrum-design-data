# Conformance fixtures (Layer 3)

Each **invalid** case lives under `invalid/<RULE_ID>/` with:

* One or more JSON **fixture** files (structurally valid for Layer 1 when targeting Layer 2 rules).
* **`expected-errors.json`** — expected diagnostics after Layer 2 validation (see `errors[].rule_id`, `severity`, optional `message_pattern`).

`deviations/` holds files for `extensions/deviations/` (SPEC-109 to SPEC-111, enforced; see its README).

**Valid** baselines live under `valid/`.

**Behavior** vector suites live under `behavior/<component>.json` (`{ "component", "vectors" }`). They are run, not validated: `design-data behavior test <component|--all>` executes each vector against `packages/design-data/behaviors/<component>.json` (see [Behavior contract](../spec/behavior-contract.md#reference-runner)). Platform adapters run the same vectors against a real implementation.

| Folder             | Rule     | Intent                                                                                                                                                                                             |
| ------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invalid/SPEC-001` | SPEC-001 | Alias target does not exist.                                                                                                                                                                       |
| `invalid/SPEC-002` | SPEC-002 | Alias resolves to incompatible type (semantic).                                                                                                                                                    |
| `invalid/SPEC-003` | SPEC-003 | Circular alias chain.                                                                                                                                                                              |
| `invalid/SPEC-004` | SPEC-004 | Duplicate `uuid` across tokens.                                                                                                                                                                    |
| `invalid/SPEC-005` | SPEC-005 | Mode set `default` not in `modes`.                                                                                                                                                                 |
| `invalid/SPEC-006` | SPEC-006 | Ambiguous resolution / specificity tie (warning).                                                                                                                                                  |
| `invalid/SPEC-008` | SPEC-008 | Non-default mode variants with no base/default variant.                                                                                                                                            |
| `invalid/SPEC-059` | SPEC-059 | Alias sets a mode that differs from its target's (warning).                                                                                                                                        |
| `invalid/SPEC-060` | SPEC-060 | Recipe part is not a declared anatomy part.                                                                                                                                                        |
| `invalid/SPEC-061` | SPEC-061 | Recipe condition names an undeclared option.                                                                                                                                                       |
| `invalid/SPEC-062` | SPEC-062 | Recipe relationship selector matches no relationship.                                                                                                                                              |
| `invalid/SPEC-063` | SPEC-063 | `sizeScale` keys differ from the component's `size` values.                                                                                                                                        |
| `invalid/SPEC-064` | SPEC-064 | Constraint names an undeclared option or value.                                                                                                                                                    |
| `invalid/SPEC-065` | SPEC-065 | Relationship scope matches only excluded combinations (warning).                                                                                                                                   |
| `invalid/SPEC-066` | SPEC-066 | Component option the recipe never uses (warning).                                                                                                                                                  |
| `invalid/SPEC-067` | SPEC-067 | Recipe `token` selector duplicates a relationship (warning).                                                                                                                                       |
| `invalid/SPEC-068` | SPEC-068 | Recipe supplies a literal size (warning).                                                                                                                                                          |
| `invalid/SPEC-069` | SPEC-069 | Recipe binds only a deprecated token (warning).                                                                                                                                                    |
| `invalid/SPEC-070` | SPEC-070 | Recipes name the focus ring part differently (warning).                                                                                                                                            |
| `invalid/SPEC-071` | SPEC-071 | Relationship contexts the recipe never binds (info).                                                                                                                                               |
| `invalid/SPEC-072` | SPEC-072 | Relationship repeats a `$ref` that has a scale counterpart (warning).                                                                                                                              |
| `invalid/SPEC-073` | SPEC-073 | Components without reviewed anatomy (info).                                                                                                                                                        |
| `invalid/SPEC-074` | SPEC-074 | Anatomy `presentWhen` names an undeclared state or option, or a wrong option value type.                                                                                                           |
| `invalid/SPEC-076` | SPEC-076 | A platform manifest drops a token a recipe binds (warning).                                                                                                                                        |
| `invalid/SPEC-079` | SPEC-079 | A platform-owned recipe does not render under the platform (warning).                                                                                                                              |
| `invalid/SPEC-080` | SPEC-080 | A platform recipe replaces a foundation recipe (info).                                                                                                                                             |
| `invalid/SPEC-081` | SPEC-081 | A `componentAliases` entry is invalid (error).                                                                                                                                                     |
| `invalid/SPEC-082` | SPEC-082 | A platform manifest fails to apply (error).                                                                                                                                                        |
| `invalid/SPEC-083` | SPEC-083 | A recipe part binds a prop the renderer does not read (warning).                                                                                                                                   |
| `invalid/SPEC-112` | SPEC-112 | A floating part does not bind both width and height (error).                                                                                                                                       |
| `invalid/SPEC-113` | SPEC-113 | A path part has path data the engine cannot draw (an arc command) (error).                                                                                                                         |
| `invalid/SPEC-114` | SPEC-114 | A floating part has both `side` and `position` (error).                                                                                                                                            |
| `invalid/SPEC-115` | SPEC-115 | A gradient has both `stops` and `ramp`, or a ramp names a channel it does not know (error).                                                                                                        |
| `invalid/SPEC-116` | SPEC-116 | A grid has a column count outside 1 through 100, or a part binds `columns` without being a grid (error).                                                                                           |
| `invalid/SPEC-117` | SPEC-117 | An image part has a source that is not a PNG `data:` URI, or a `fit` that is not cover, contain, fill or none (error).                                                                             |
| `invalid/SPEC-118` | SPEC-118 | A behavior contract names a state option or anatomy part the component does not have (warning).                                                                                                    |
| `invalid/SPEC-119` | SPEC-119 | A behavior transition names an intent that is not in the intents registry (warning).                                                                                                               |
| `invalid/SPEC-120` | SPEC-120 | A behavior vector names an intent that is not in the intents registry (warning).                                                                                                                   |
| `invalid/SPEC-090` | SPEC-090 | Structured context fields disagree with the `context` string (warning).                                                                                                                            |
| `invalid/SPEC-091` | SPEC-091 | Context main word is not in the registry (warning).                                                                                                                                                |
| `invalid/SPEC-092` | SPEC-092 | Live record has no context and no contexted record reaches it (warning).                                                                                                                           |
| `invalid/SPEC-093` | SPEC-093 | Context names an option value that belongs in `scope.options` (error).                                                                                                                             |
| `invalid/SPEC-094` | SPEC-094 | A state is listed in more than one element of one state array (warning).                                                                                                                           |
| `invalid/SPEC-095` | SPEC-095 | A component declares an option named `anyOf` (error).                                                                                                                                              |
| `invalid/SPEC-096` | SPEC-096 | An `anyOf` pins the same single option in every alternative (warning).                                                                                                                             |
| `invalid/SPEC-097` | SPEC-097 | An `anyOf` alternative repeats a pin or is covered by another (warning).                                                                                                                           |
| `invalid/SPEC-098` | SPEC-098 | An `anyOf` alternative pins no declared option (warning).                                                                                                                                          |
| `invalid/SPEC-099` | SPEC-099 | A relationship with a `legacyKey` uses an `anyOf` (error).                                                                                                                                         |
| `invalid/SPEC-100` | SPEC-100 | Records that differ only in one declared option's value (warning).                                                                                                                                 |
| `invalid/SPEC-101` | SPEC-101 | A `scope.between` or descriptive scope value is not in its vocabulary (warning).                                                                                                                   |
| `invalid/SPEC-102` | SPEC-102 | A field is used on a token whose effective tier its `allowedTokenTiers` excludes (warning).                                                                                                        |
| `invalid/SPEC-103` | SPEC-103 | An explicit `tokenTier` differs from the derived tier (info).                                                                                                                                      |
| `invalid/SPEC-104` | SPEC-104 | A slot names an undeclared part or component, a collection that is not an array option, inverted counts, a demo that breaks its rules, or a name that is neither `default` nor its part.           |
| `invalid/SPEC-105` | SPEC-105 | A `type-style` record whose `$ref` is not a typography composite, a typography `$ref` without that property, an undeclared size pin, or a composite size the component does not declare (warning). |
| `invalid/SPEC-106` | SPEC-106 | An anatomy part whose `component` names an undeclared component, a deprecated component, or the component itself.                                                                                  |
| `invalid/SPEC-107` | SPEC-107 | A relationship whose `scope.itemPosition` is on a part that is not the repeated part of a collection slot (or inside it), has no part, or is not first, middle, last or only.                      |
| `invalid/SPEC-108` | SPEC-108 | A `slot` recipe part that is not the part of a non-collection slot, whose slot declares no `accepts`, or whose `with` or `sizeMap` is invalid for an accepted component.                           |

Implementors SHOULD run these fixtures once the Rust validator exposes rule IDs ([#724](https://github.com/adobe/spectrum-design-data/issues/724), [#725](https://github.com/adobe/spectrum-design-data/issues/725)).

***

## Resolution conformance fixtures

Each **resolution** case lives under `resolution/<name>/` with:

* `input/` — cascade-format `.tokens.json` files
* `mode-sets/` — (optional) mode set declaration JSON files
* `query.json` — `{ "property": "...", "context": { ... } }` — the resolution query
* `expected.json` — `{ "resolved": bool, "expected_uuid": "..." }` — expected outcome

| Folder                                    | Intent                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `resolution/base-fallback`                | Mode-set-agnostic base token MUST match any context (wildcard behavior). |
| `resolution/specificity-wins`             | Higher-specificity variant MUST win over base when both match.           |
| `resolution/alias-resolved-after-cascade` | Cascade selects the winner first; alias `$ref` chain resolves after.     |

The Rust SDK drives these fixtures in `sdk/core/src/lib.rs` (`resolution_conformance` module, closes [#768](https://github.com/adobe/spectrum-design-data/issues/768)).

***

## Diff conformance fixtures

Each **diff** case lives under `diff/<name>/` with:

* `old/` — old token dataset (`.tokens.json` cascade arrays or `.json` legacy format)
* `new/` — new token dataset
* `expected.json` — full `DiffReport` structure (six category arrays: renamed, deprecated, reverted, added, deleted, updated)

| Folder                              | Intent                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `diff/identical-tokens`             | Two identical datasets MUST produce an empty diff (all arrays empty).           |
| `diff/simple-add-delete`            | One old-only token → deleted; one new-only token → added.                       |
| `diff/rename-by-uuid`               | Same UUID, different name objects → renamed (not add + delete).                 |
| `diff/deprecated-new-token`         | Unmatched new token with `deprecated: true` → deprecated (not added).           |
| `diff/deprecated-set-level`         | All set entries `deprecated: true` normalizes to token-level deprecated.        |
| `diff/reverted-token`               | Matched token that loses `deprecated` → reverted (not updated).                 |
| `diff/matched-gaining-deprecated`   | Matched token that gains `deprecated` → updated (not deprecated).               |
| `diff/property-value-update`        | Matched token with changed `value` → updated with property change.              |
| `diff/property-nested-change`       | Nested object change reported at leaf path (e.g. `sets.light.value`).           |
| `diff/uuid-backfill`                | Old lacks UUID, new gains it with same name object → paired (not add + delete). |
| `diff/cross-format`                 | Legacy old + cascade new, paired by UUID across formats.                        |
| `diff/rename-with-property-changes` | Renamed token with additional value changes populates `property_changes`.       |

The Rust SDK drives these fixtures in `sdk/core/src/lib.rs` (`diff_conformance` module, closes [#788](https://github.com/adobe/spectrum-design-data/issues/788)).

***

## Generation conformance fixtures

Each **generation** case lives under `generation/<name>/` with:

* `input/` — cascade-format `.tokens.json` files (array-of-objects format)
* `expected/` — expected deterministic legacy set-format output (keyed-object format, one file per input file)

These fixtures verify the field-mapping contract in [Evolution — Legacy format contract](../spec/evolution.md#legacy-format-contract): given the same cascade input, the output generator MUST produce byte-identical output on successive runs.

| Folder                      | Intent                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| `generation/flat-token`     | A single cascade token with no mode sets maps to a single keyed entry `{ slug: { value, uuid } }`. |
| `generation/mode-set-token` | Multiple cascade tokens sharing a `conceptId` merge into a single `sets`-keyed entry.              |

The Rust SDK drives these fixtures via `design-data migrate legacy-output` (see `sdk/core/src/legacy.rs`).
Consumer implementations MUST regenerate each `input/` and diff against `expected/` to claim conformance
with the output-generator determinism contract.

See [`generation/README.md`](generation/README.md) for the fixture format, the run command, and
documentation of the `conceptId`/`set_schema` cascade grouping fields used in `mode-set-token`.

***

## Query conformance fixtures

Each **query** case lives under `query/<name>/` with:

* `input/` — cascade-format `.tokens.json` files
* `query.txt` — plain-text filter expression
* `expected.json` — sorted array of matched token UUIDs

| Folder                    | Intent                                                  |
| ------------------------- | ------------------------------------------------------- |
| `query/single-field`      | Basic `key=value` equality filter.                      |
| `query/and-conditions`    | `,` (AND) requires all conditions to match.             |
| `query/or-conditions`     | `\|` (OR) matches if any alternative matches.           |
| `query/negation`          | `!=` matches non-equal values and absent fields.        |
| `query/wildcard-suffix`   | Glob `*` at end of value matches prefix.                |
| `query/wildcard-prefix`   | Glob `*` at start of value matches suffix.              |
| `query/empty-matches-all` | Empty filter expression is a universal match.           |
| `query/no-matches`        | Filter with no matching tokens returns empty result.    |
| `query/schema-key`        | `$schema` key queries the top-level `$schema` field.    |
| `query/and-or-precedence` | AND binds tighter than OR: `a,b\|c` = `(a AND b) OR c`. |

The Rust SDK drives these fixtures in `sdk/core/src/lib.rs` (`query_conformance` module, closes [#788](https://github.com/adobe/spectrum-design-data/issues/788)).

***

## Manifest extensions conformance fixtures

Each **manifest-extensions** case lives under `manifest-extensions/valid/<name>/`
or `manifest-extensions/invalid/<name>/` with:

* `manifest.json` — a Layer 2 platform manifest (applied against the shared
  `manifest-extensions/base/dataset.json` seed graph)
* an `extensions/` directory tree (or custom-named via `extensionsDir`) with
  category subdirectories (`tokens/`, `components/`, `fields/`, `guidelines/`,
  `platform-extensions/`, `relationships/`)
* `valid/` cases: `expected.json` — optional post-apply graph predicates
  (relationship `byUuid`/`absent`, component/field/guideline `present`, token
  `orderByUuid`); `{}` when the case only proves the manifest applies cleanly
* `invalid/` cases: `expected-errors.json` — `{ "errors": [{ "message_pattern": "..." }] }`,
  every pattern regex-matched against the single returned error message

See [`manifest-extensions/README.md`](manifest-extensions/README.md) for the
full case table. The Rust SDK drives these fixtures in `sdk/core/src/lib.rs`
(`manifest_extensions_conformance` and `manifest_extensions_behavior` modules).
