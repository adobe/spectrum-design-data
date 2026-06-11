---
"@adobe/design-data-spec": minor
---

Add `guideline` entity — standalone design guidance document type.

- **schemas/guideline.schema.json**: new Layer 1 schema for non-component guidance
  pages; requires `$id`, `name`, `title`, `category`, `documentBlocks`; reuses
  `document-block.schema.json` for the body.
- **rules/rules.yaml**: SPEC-045 (`guideline-missing-purpose`, warning) and
  SPEC-046 (`guideline-related-resolves`, warning).
- **spec/guideline-format.md**: normative spec prose for the guideline entity.
- **spec/index.md**, **spec/dataset-layout.md**: register `guidelines/` as an
  optional dataset directory.
- **schemas/dataset.schema.json**: add `guidelines` to declared directories/paths.
