# @adobe/design-system-registry

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
