# @adobe/design-system-registry

## 5.0.5

### Patch Changes

- Updated dependencies [[`dcf0832`](https://github.com/adobe/spectrum-design-data/commit/dcf083214d56989817db192801638e3ec20e2306)]:
  - @adobe/spectrum-design-data@0.7.1

## 5.0.4

### Patch Changes

- Updated dependencies [[`a23dafb`](https://github.com/adobe/spectrum-design-data/commit/a23dafb1805dac8203baba669c61085133160454), [`a23dafb`](https://github.com/adobe/spectrum-design-data/commit/a23dafb1805dac8203baba669c61085133160454)]:
  - @adobe/spectrum-design-data@0.7.0

## 5.0.3

### Patch Changes

- Updated dependencies [[`e7fbcb0`](https://github.com/adobe/spectrum-design-data/commit/e7fbcb00b6afe1c1a272ed72b7ed22c08fe8e978), [`e7fbcb0`](https://github.com/adobe/spectrum-design-data/commit/e7fbcb00b6afe1c1a272ed72b7ed22c08fe8e978)]:
  - @adobe/spectrum-design-data@0.6.0

## 5.0.2

### Patch Changes

- Updated dependencies [[`f84bce2`](https://github.com/adobe/spectrum-design-data/commit/f84bce215d20f1bc8b109f3f23b15bfab6b239d0)]:
  - @adobe/spectrum-design-data@0.4.0

## 5.0.1

### Patch Changes

- Updated dependencies [[`60a4835`](https://github.com/adobe/spectrum-design-data/commit/60a4835e245965639a4ac89b41d2884dd63a0bbb)]:
  - @adobe/spectrum-design-data@0.3.0

## 5.0.0

### Major Changes

- [#1113](https://github.com/adobe/spectrum-design-data/pull/1113) [`e23264e`](https://github.com/adobe/spectrum-design-data/commit/e23264e681c56077b5582bf019123b941862779a) Thanks [@GarthDB](https://github.com/GarthDB)! - Move Spectrum registry vocabulary into spectrum-design-data; deprecate design-system-registry.
  - **@adobe/spectrum-design-data**: gains `registry/` (27 vocabulary files) with
    subpath exports (`./registry/*.json`); now the single source of truth for all Spectrum data.
  - **@adobe/design-system-registry**: reduced to a compatibility shim. Migrate imports to
    `@adobe/spectrum-design-data` — this shim will be removed in a future major version.
  - **@adobe/design-data-spec**: gains `registry-value.json` and `platform-extension.json`
    schema exports; `manifest.schema.json` `conceptOrder` enum relaxed to open `string` type
    (no longer hardcodes Spectrum's field names — configurable per field catalog).

### Patch Changes

- Updated dependencies [[`073c22a`](https://github.com/adobe/spectrum-design-data/commit/073c22a75c27fbb44eb57eb6cb7311e294066d76), [`e23264e`](https://github.com/adobe/spectrum-design-data/commit/e23264e681c56077b5582bf019123b941862779a), [`e23264e`](https://github.com/adobe/spectrum-design-data/commit/e23264e681c56077b5582bf019123b941862779a), [`e23264e`](https://github.com/adobe/spectrum-design-data/commit/e23264e681c56077b5582bf019123b941862779a)]:
  - @adobe/spectrum-design-data@0.2.0

## 3.3.0

### Minor Changes

- [#977](https://github.com/adobe/spectrum-design-data/pull/977) [`526d2de`](https://github.com/adobe/spectrum-design-data/commit/526d2de363788c1e916a1ed6426e14600d84fd73) Thanks [@GarthDB](https://github.com/GarthDB)! - Classify line-height multiplier and CJK line-height multiplier tokens.
  - **registry/property-terms.json**: add `line-height-multiplier` term (unitless ratio,
    distinct from absolute px line-height paired with a font-size tier).
  - **sdk/validate/rules/mod.rs**: add `multiplier.json` to typography `DOMAIN_SCHEMAS`
    so the `family` field is permitted on CJK multiplier tokens (SPEC-042).
  - **sdk/validate/rules/spec043.rs**: extend typography domain-required-fields check to
    accept `scaleIndex` and `structure` alongside `family`/`weight`/`style`.
  - **token-names/names/typography.json**: sidecar entries for all 4 tokens.
  - Reduces SPEC-017 warning count by 4.

- [#977](https://github.com/adobe/spectrum-design-data/pull/977) [`526d2de`](https://github.com/adobe/spectrum-design-data/commit/526d2de363788c1e916a1ed6426e14600d84fd73) Thanks [@GarthDB](https://github.com/GarthDB)! - Classify 5 margin multiplier tokens; add margin property-terms and typography structures.
  - **registry/property-terms.json**: add `margin`, `margin-top`, `margin-bottom`.
  - **registry/structures.json**: add `body`, `detail`, `heading` typography-scale structures.
  - **token-names/names/typography.json**: sidecar entries for all 5 tokens using
    `{ structure, property }` shape.
  - Reduces SPEC-017 (`string-name-tech-debt`) warning count by 5.

## 3.2.0

### Minor Changes

- [#969](https://github.com/adobe/spectrum-design-data/pull/969) [`ba06968`](https://github.com/adobe/spectrum-design-data/commit/ba06968226adb268600e0ed1befc9d381e7986b6) Thanks [@GarthDB](https://github.com/GarthDB)! - Typography stragglers: structured `name` on text-align and letter-spacing tokens.
  - **typography.json**: 4 tokens gain `name` — 3 `text-align-*` and 1 bare
    `letter-spacing`.
  - **design-system-registry**: add `text-align` to `property-terms.json`;
    new `alignments.json` registry (start/center/end); regenerate `registry_data.rs`.
  - **design-data-spec**: new `alignment` spec field; `taxonomy.md` updated.
  - **token-corpus-migrate**: add `alignmentNameForKey`, `letterSpacingNameForKey`,
    `lineHeightMultiplierNameForKey` (exported for future use); extend dispatch.
  - Line-height multipliers and CJK line-height deferred — SPEC-006 collision
    and SPEC-042 constraint; follow-ups tracked in beads.

## 3.1.3

### Patch Changes

- [#967](https://github.com/adobe/spectrum-design-data/pull/967) [`dfddf12`](https://github.com/adobe/spectrum-design-data/commit/dfddf123e92ff31eeb8a71bb6350f189ef39de13) Thanks [@GarthDB](https://github.com/GarthDB)! - Icons name-object migration: structured `name` on family-scoped icon-color
  tokens in `icons.json`.
  - **icons.json**: 56 color-set tokens gain
    `name: { property: "icon-color", colorFamily, [object|variant|state] }`.
  - **design-system-registry**: add `icon-color` to `property-terms.json`;
    regenerate `registry_data.rs`.
  - **token-corpus-migrate**: add `iconColorNameForKey`; add `icons.json` to
    pilot scope.
  - 23 alias tokens deferred — `colorFamily` is not permitted on `alias.json`
    by SPEC-042; follow-up will address when the alias name shape is defined.

## 3.1.2

### Patch Changes

- [#965](https://github.com/adobe/spectrum-design-data/pull/965) [`c133c83`](https://github.com/adobe/spectrum-design-data/commit/c133c832f605e6f09b8bc5db80a6f98b46233b2c) Thanks [@GarthDB](https://github.com/GarthDB)! - Typography canonical name-object migration: add `name` fields to remaining
  non-alias typography tokens in `typography.json`.
  - **font-family tokens** (4): gain `name: { property: "font-family", family }`.
  - **font-style tokens** (2): gain `name: { property: "font-style", style }`.
  - **font-size scale-set tokens** (18): gain `name: { property: "font-size", scaleIndex }`.
  - **line-height scale-set tokens** (18): gain `name: { property: "line-height", scaleIndex }`.
  - **design-system-registry**: add `font-style` to `property-terms.json`; add
    `normal` to `typography-styles.json`; update `registry_data.rs`.
  - **token-corpus-migrate**: extend with `fontFamilyNameForKey`, `fontStyleNameForKey`,
    `fontSizeNameForKey`, `lineHeightNameForKey` classifiers.

## 3.1.1

### Patch Changes

- [#963](https://github.com/adobe/spectrum-design-data/pull/963) [`af22092`](https://github.com/adobe/spectrum-design-data/commit/af22092744c70af7ce0c659e16cdabe31b92b111) Thanks [@GarthDB](https://github.com/GarthDB)! - Pilot name-object migration: add structured `name` fields to color palette and
  font-weight tokens (closes first phase of taxonomy corpus migration).
  - **color-palette.json**: 369 tokens gain `name: { property, colorFamily, scaleIndex? }`.
  - **typography.json**: 6 canonical font-weight tokens gain `name: { property, weight }`.
  - **design-system-registry**: export the six new taxonomy registries added in #961 via
    the package.json `exports` map; add `propertyTerms` named export to `index.js`.
  - **tools/token-corpus-migrate**: new migration tool for injecting name objects;
    run dry-run with `node tools/token-corpus-migrate/src/cli.js --root <tokens-src>`,
    apply with `--write`.

## 3.1.0

### Minor Changes

- [#955](https://github.com/adobe/spectrum-design-data/pull/955) [`e05c3ef`](https://github.com/adobe/spectrum-design-data/commit/e05c3eff28caecbdb9782eb62023876e0d1f4947) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): property field migration path + property-terms registry (#941)

  Adds normative migration policy for the `name.property` field per RFC #806:
  - New `### Name-object migration policy` section in `spec/token-format.md` —
    documents SPEC-017 severity escalation to `error` at spec `2.0.0`, narrowed
    `property` semantics (CSS/styling attribute only), and author migration steps.
  - New `property-terms.json` registry — 35 seeded CSS/styling attribute terms
    (`color`, `background-color`, `border-radius`, `font-size`, `gap`, etc.).
  - Updated `fields/property.json` — sets `registry` path to `property-terms.json`;
    exports `propertyTerms` from registry index.
  - Updated `spec/taxonomy.md` Property row — links to migration section and
    calls out anatomy/surface values as migration debt.
  - Closed RFC #806 open question in `docs/rfc-coordination.md`.

## 3.0.0

### Major Changes

- [#924](https://github.com/adobe/spectrum-design-data/pull/924) [`20bb703`](https://github.com/adobe/spectrum-design-data/commit/20bb7035ad7d62513670bfb393b70766a295e51c) Thanks [@GarthDB](https://github.com/GarthDB)! - Close RFC #661 category validation gap: add SPEC-034 advisory rule and
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

### Patch Changes

- [#927](https://github.com/adobe/spectrum-design-data/pull/927) [`6a855e9`](https://github.com/adobe/spectrum-design-data/commit/6a855e98caad99d8799e4c2ed4a822a5776bd2da) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `disclosure-triangle`, `picker`, `progress-bar` to anatomy-terms.json.

  Closes the spec/registry divergence surfaced during SPEC-035 implementation
  (#924) — these three names appear in the canonical vocabulary table in
  spec/anatomy-format.md but were missing from the registry, causing SPEC-035
  to advisory-warn on them. Resolves #925.

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
