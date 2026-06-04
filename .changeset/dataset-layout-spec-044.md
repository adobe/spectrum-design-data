---
"@adobe/design-data-spec": minor
"@adobe/design-data": minor
---

Define the normative dataset-directory layout and add the SPEC-044 structural
pre-check (closes #1114).

- **spec/dataset-layout.md**: new normative chapter for required/optional
  directories, the discovery algorithm, and the optional root descriptor.
- **schemas/dataset.schema.json**: new optional `dataset.json` root descriptor;
  allow `$schema` in `mode-set.schema.json`.
- **SPEC-044** (`dataset-structure`, error): pre-check that `tokens/` holds at
  least one `*.tokens.json`; warns on empty registered optional directories.
- **sdk**: add `check_dataset_structure`, a `validate_dataset` entry point, and a
  `validate-dataset` CLI subcommand that schema-validates the catalog directories.
