---
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

Add the `typeStyle` recipe prop (type styles, renderer half; 5m92.25.1).

- A `text` part can bind `typeStyle` to a `type-style` relationship record. The renderer
  unpacks the composite it `$ref`s for the request's scale into `fontFamily`, `fontSize`,
  `fontWeight` and `lineHeight`. A font prop the part binds itself wins for its axis.
- Diagnostics: `typeStyle: '<label>' is not a typography composite` and
  `typeStyle: <composite>.<axis> '{<alias>}' not found`.
- Spec text for the prop and its precedence in component-visuals.md; the component-visual
  schema lists `typeStyle`.
- Diagnostic also: `typeStyle: composite has no such axis`.
- CLI 0.60.0 (0.59.0 is released); `requires.cli` is unchanged.
- No recipe uses it yet, so no rendered output changes. `layoutRevision` is unchanged:
  nothing in the solver or layout semantics moves for existing recipes.
- Core: `cascade::resolve_reference_in` and `typography::unpack_in` take a prebuilt alias
  index, so unpacking many composites does not rescan the tokens.
