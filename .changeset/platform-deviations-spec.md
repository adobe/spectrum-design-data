---
"@adobe/design-data-spec": minor
---

Platform manifests can declare `deviations`: where a platform cannot match a component's recipe.

- New schema `platform-deviation.schema.json`; `manifest.md` gains `extensions/deviations/`.
- SPEC-109 to SPEC-111 are defined in `rules.yaml`. The SDK does not load the directory yet,
  so none is enforced. Loading and tool behaviour follow.
- `component-visuals.md`: a renderer MUST NOT read deviations.
- Proposal 019 records the design.
