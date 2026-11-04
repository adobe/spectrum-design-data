---
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

feat(sdk): spec sheets show relationship records that have no context (qkj5.106, qkj5.107)

- **design-data spec-sheet**: records without a `context` form one block per relationship
  property, titled from the property and marked `titleSource: "property"`. Inline-value
  records are rows with `source: "inline"`, the value and no token. Every component with
  relationships now has at least one block.
- **design-data spec-sheet**: scales of one token merge into a row; color schemes (`light`,
  `dark`, `wireframe`) get their own value key, so they no longer overwrite each other.
- **component-spec-sheet.schema.json**: blocks gain required `titleSource` and `records`;
  items gain required `source`. Regenerate any sheet made before this change.
