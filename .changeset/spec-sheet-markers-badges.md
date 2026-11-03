---
"@adobe/design-data-spec": patch
---

feat(spec): spec-sheet markers per token group, Bindings changed badge, dataset revision

In the draft `component-spec-sheet.schema.json`, `render.markers` number 1..n per group of
token rows and each token item carries its `marker` (rows no longer do). Blocks can show a
"Bindings changed" badge, and the sheet carries `datasetRevision`, the same revision the
changelog records.
