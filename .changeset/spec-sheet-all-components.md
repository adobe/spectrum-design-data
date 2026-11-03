---
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

feat(sdk): spec sheets for every component with relationships (`design-data spec-sheet --all`)

`design-data spec-sheet --all -o <dir> [--changelog-dir <dir>]` writes one sheet per component
with relationships plus `index.json` (visual flag, page and block counts, version and latest
release). A component with a visual recipe gets a full sheet; any other gets a table-only
sheet: `visual: false`, blocks with token rows and `render: null`, so views can say "No visual
recipe yet". The same stub is the starting point for a new component.
`component-spec-sheet.schema.json` gains `visual` and a nullable block `render`.

Line-height and font-family relationships now sit on the Typography page, not Layout.
