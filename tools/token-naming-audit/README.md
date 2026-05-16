# Token Naming Audit

Audit tool that scans `*.tokens.json` files and reports two classes of naming migration debt:

1. **String-form `name` tokens** — tokens where `name` is a plain string instead of a structured name object (SPEC-017 scope). Cross-referenced against `naming-exceptions.json` to distinguish known legacy debt from unrecorded violations.
2. **Overloaded `property` values** — tokens with a structured name object where `name.property` is not in the `property-terms.json` registry. Includes hints for which field the value should move to (`anatomy` or `object`).

## Usage

```sh
# Print Markdown report to stdout
token-naming-audit --root /path/to/spectrum-design-data

# Write report to a file
token-naming-audit --root /path/to/spectrum-design-data --output audit-report.md
```

## Options

| Flag                | Default         | Description                                        |
| ------------------- | --------------- | -------------------------------------------------- |
| `--root <dir>`      | `process.cwd()` | Workspace root to scan for `*.tokens.json` files   |
| `--output <path>`   | stdout          | Write the Markdown report to this file path        |
| `--format markdown` | `markdown`      | Output format (only `markdown` is supported today) |

## Interpreting the report

* **Unrecorded string-name tokens** — these are the actionable items. Each must either be converted to a structured name object or added to `naming-exceptions.json` with a justification.
* **Known exceptions** — tracked in `naming-exceptions.json`. These will become errors when SPEC-017 graduates at spec 2.0.0 (see issue [#953](https://github.com/adobe/spectrum-design-data/issues/953)).
* **Overloaded property values** — migrate the value to the suggested field (`anatomy` or `object`). If no suggestion appears, the value may be a design-system abstraction not yet in any registry.

## Related

* [SPEC-017 tracking issue #953](https://github.com/adobe/spectrum-design-data/issues/953)
* [Issue #954 (this tool)](https://github.com/adobe/spectrum-design-data/issues/954)
* [Property field migration policy (PR #955)](https://github.com/adobe/spectrum-design-data/pull/955)
* [RFC #806 — taxonomy backbone](https://github.com/adobe/spectrum-design-data/discussions/806)
