---
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

The reference SDK loads a platform manifest's `extensions/deviations/` and enforces SPEC-109 to 111.

- SPEC-109: a deviations file matches its schema; ids are unique per file.
- SPEC-110: component, part, states, options and modes of a deviation resolve.
- SPEC-111 (warning): a deviation's `property` is one its `part` sets in the recipe.
- `render-compare`, `validate-manifest` and `platform impact` ignore them for now.
