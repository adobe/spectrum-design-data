# @adobe/design-system-registry

## 2.0.0

### Major Changes

- [#923](https://github.com/adobe/spectrum-design-data/pull/923) [`f3a0a6b`](https://github.com/adobe/spectrum-design-data/commit/f3a0a6b6bc03774e870aad989c16d9b532406aaf) Thanks [@GarthDB](https://github.com/GarthDB)! - Close RFC #661 category validation gap: add SPEC-034 advisory rule and
  align the `data-visualization` category id across all surfaces.
  - `spec/registry.md` — marks the categories.json gap closed; SPEC-034
    is now the authoritative validator for `meta.category`.
  - `schemas/component.schema.json` — loosens `meta.category` from a
    hard-coded enum to a free-form string; SPEC-034 (warning-level) is
    the single source of validation.
  - `rules/rules.yaml` — adds SPEC-034
    (`component-category-registry-sync`, severity: warning).
  - `packages/design-system-registry/registry/categories.json` — removes
    the `"data visualization"` alias from `data-visualization`; kebab-case
    is the sole canonical form.
  - `components/table.json` — migrates `meta.category` from
    `"data visualization"` to `"data-visualization"`.
  - `docs/rfc-coordination.md` — RFC #661 open question marked resolved.
  - SDK: new `spec034.rs` rule + `categories()` accessor on `RegistryData`
    - codegen updated to embed `categories.json`.

## 1.4.0

### Minor Changes

- [#915](https://github.com/adobe/spectrum-design-data/pull/915) [`4f53a93`](https://github.com/adobe/spectrum-design-data/commit/4f53a932177c618e8b09e858cdeafe116d6b4f33) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(registry): expand anatomy-terms from 43 to 119 terms via S2 docs audit

## 1.3.0

### Minor Changes

- [#837](https://github.com/adobe/spectrum-design-data/pull/837) [`29531ee`](https://github.com/adobe/spectrum-design-data/commit/29531ee2a9935922bab329c26edce1de8489a423) Thanks [@GarthDB](https://github.com/GarthDB)! - Expand registry vocabulary across `anatomy-terms`, `sizes`, and `variants`
  to close the gaps surfaced by token-to-spec gap analysis. Adds anatomy
  terms for component parts (field, fill, value, container, chevron, loupe,
  dot, and related), broadens the sizes registry, and adds semantic dialog
  and component variants (confirmation, destructive, warning, error,
  information, plus typographic and component-axis variants). Vocabulary
  only — no breaking changes for existing tokens.

## 1.2.0

### Minor Changes

- [#812](https://github.com/adobe/spectrum-design-data/pull/812) [`32029a9`](https://github.com/adobe/spectrum-design-data/commit/32029a9d0565efcd448c399e767844389730ef2c) Thanks [@GarthDB](https://github.com/GarthDB)! - Split sizes.json: remove numeric scale values (50-1500), keeping
  only semantic t-shirt sizes (xs-xxxl). Numeric values 1100-1500
  added to scale-values.json to preserve data completeness.

- [#810](https://github.com/adobe/spectrum-design-data/pull/810) [`4a55a5f`](https://github.com/adobe/spectrum-design-data/commit/4a55a5f2b027d7df73852cb62dd633bd5da17c93) Thanks [@GarthDB](https://github.com/GarthDB)! - Add taxonomy registries and expand token name object schema.
  - Split `anatomy-terms.json`: removed styling surfaces and positional terms
  - Added `token-objects.json` (background, border, edge, visual, content)
  - Added 6 new taxonomy registries:
    structures, substructures, orientations, positions, densities, shapes
  - Exported all 7 new registries from package index
  - Added all 13 semantic fields explicitly to `nameObject` in
    `token.schema.json`, distinguishing semantic from dimension fields

## 1.1.0

### Minor Changes

- [#660](https://github.com/adobe/spectrum-design-data/pull/660) [`4051014`](https://github.com/adobe/spectrum-design-data/commit/4051014951c5c68c01b69be5ee156b4fc8fe98ed) Thanks [@GarthDB](https://github.com/GarthDB)! - Add Design System Registry package providing a single source of truth for
  terminology used across Spectrum tokens, component schemas, and anatomy.
  Includes registries for sizes, states, variants, anatomy terms, components,
  scale values, categories, and platforms with JSON schema validation and
  comprehensive tests.

## 1.0.0

### Minor Changes

- Initial release of Design System Registry package
