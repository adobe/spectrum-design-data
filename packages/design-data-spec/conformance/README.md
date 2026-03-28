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
