---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": patch
---

`dataset.json` can declare `requires.cli`, the oldest design-data CLI that can read the dataset
correctly, as an exact version (not a range; a dataset says what it needs, not what future CLIs
will do). This dataset declares `0.40.0`: CLI 0.37.0 refuses its `anyOf` state pins ("the data
is newer than this engine") and 0.40.0 reads them.

`dataset.schema.json` and `spec/dataset-layout.md` gain the field. A CLI older than
`requires.cli`, or older than a declared `layoutRevision`, now exits with an error instead of
reading the data wrongly; `--ignore-data-requirements` reads it anyway and warns on every run
(command line only, never a config file). Datasets released before this one have no `requires`
and are not checked. CI renders a smoke set with the released minimum CLI and the current one
and fails if the scenes differ.
