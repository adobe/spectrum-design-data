# Conformance fixtures (Layer 3)

Each **invalid** case lives under `invalid/<RULE_ID>/` with:

- One or more JSON **fixture** files (structurally valid for Layer 1 when targeting Layer 2 rules).
- **`expected-errors.json`** — expected diagnostics after Layer 2 validation (see `errors[].rule_id`, `severity`, optional `message_pattern`).

**Valid** baselines live under `valid/`.

| Folder             | Rule     | Intent                                            |
| ------------------ | -------- | ------------------------------------------------- |
| `invalid/SPEC-001` | SPEC-001 | Alias target does not exist.                      |
| `invalid/SPEC-002` | SPEC-002 | Alias resolves to incompatible type (semantic).   |
| `invalid/SPEC-003` | SPEC-003 | Circular alias chain.                             |
| `invalid/SPEC-004` | SPEC-004 | Duplicate `uuid` across tokens.                   |
| `invalid/SPEC-005` | SPEC-005 | Dimension `default` not in `modes`.               |
| `invalid/SPEC-006` | SPEC-006 | Ambiguous resolution / specificity tie (warning). |

Implementors SHOULD run these fixtures once the Rust validator exposes rule IDs ([#724](https://github.com/adobe/spectrum-design-data/issues/724), [#725](https://github.com/adobe/spectrum-design-data/issues/725)).
