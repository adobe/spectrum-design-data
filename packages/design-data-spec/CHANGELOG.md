# @adobe/design-data-spec

## 2.4.0

### Minor Changes

- [`e7fbcb0`](https://github.com/adobe/spectrum-design-data/commit/e7fbcb00b6afe1c1a272ed72b7ed22c08fe8e978) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `guideline` entity — standalone design guidance document type.
  - **schemas/guideline.schema.json**: new Layer 1 schema for non-component guidance
    pages; requires `$id`, `name`, `title`, `category`, `documentBlocks`; reuses
    `document-block.schema.json` for the body.
  - **rules/rules.yaml**: SPEC-045 (`guideline-missing-purpose`, warning) and
    SPEC-046 (`guideline-related-resolves`, warning).
  - **spec/guideline-format.md**: normative spec prose for the guideline entity.
  - **spec/index.md**, **spec/dataset-layout.md**: register `guidelines/` as an
    optional dataset directory.
  - **schemas/dataset.schema.json**: add `guidelines` to declared directories/paths.

## 2.2.0

### Minor Changes

- [#1126](https://github.com/adobe/spectrum-design-data/pull/1126) [`60a4835`](https://github.com/adobe/spectrum-design-data/commit/60a4835e245965639a4ac89b41d2884dd63a0bbb) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-043 domain-identifying fields to all 72 typography token name objects
  (closes #1125).
  - **tokens/typography.tokens.json**: add `weight` (font-weight × 6, composite × 15),
    `style` (× 2), `family` (× 4), `scaleIndex` (font-size × 36), `structure` (margin
    multipliers × 5), and `scaleIndex`+`family:cjk` (line-height × 4) — zero SPEC-043
    advisory warnings for this file.
  - **registry/scale-values.json**: add `25` entry for `font-size-25` (`scaleIndex: 25`).
  - **spec/taxonomy.md**: add `structure` row to the typography field table; broaden
    NORMATIVE SHOULD clause to all five fields accepted by SPEC-043.

## 2.1.0

### Minor Changes

- [#1118](https://github.com/adobe/spectrum-design-data/pull/1118) [`8e017b2`](https://github.com/adobe/spectrum-design-data/commit/8e017b269f243a4842ba7239731041f8e56e4360) Thanks [@GarthDB](https://github.com/GarthDB)! - Define the normative dataset-directory layout and add the SPEC-044 structural
  pre-check (closes #1114).
  - **spec/dataset-layout.md**: new normative chapter for required/optional
    directories, the discovery algorithm, and the optional root descriptor.
  - **schemas/dataset.schema.json**: new optional `dataset.json` root descriptor;
    allow `$schema` in `mode-set.schema.json`.
  - **SPEC-044** (`dataset-structure`, error): pre-check that `tokens/` holds at
    least one `*.tokens.json`; warns on empty registered optional directories.
  - **sdk**: add `check_dataset_structure`, a `validate_dataset` entry point, and a
    `validate-dataset` CLI subcommand that schema-validates the catalog directories.

## 2.0.0

### Major Changes

- [#1113](https://github.com/adobe/spectrum-design-data/pull/1113) [`e23264e`](https://github.com/adobe/spectrum-design-data/commit/e23264e681c56077b5582bf019123b941862779a) Thanks [@GarthDB](https://github.com/GarthDB)! - Consolidate Spectrum-specific design data into a single package.
  - **`@adobe/design-data-spec`**: removed `components/`, `fields/`, and `mode-sets/` directories
    and their exports. Now a pure generalized format definition (schemas, spec, rules, conformance).
    The `./components/*.json` export is no longer published — major bump because removing a
    published export is a breaking change per semver.
  - **`@adobe/spectrum-design-data`**: added `components/` (81 component declarations), `fields/`
    (24 field catalog files), and `mode-sets/` (3 mode-set instances) alongside the existing
    `tokens/`. New exports: `./components/*`, `./fields/*`, `./mode-sets/*`.

### Minor Changes

- [#1110](https://github.com/adobe/spectrum-design-data/pull/1110) [`073c22a`](https://github.com/adobe/spectrum-design-data/commit/073c22a75c27fbb44eb57eb6cb7311e294066d76) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate cascade token `$ref` aliases from name strings to UUIDs.
  - **packages/design-data/tokens/\*.tokens.json**: alias `$ref` now holds the
    target's UUID (rename-proof, cascade canonical). Legacy `packages/tokens/src`
    is unchanged — roundtrip-verify stays clean.
  - **sdk/core/src/graph.rs**: add `resolve_alias_key` (UUID-first + slug + legacy-
    name-index fallback); fix cycle-guard to key on resolved graph key; index
    `set_uuid` so set-targeted aliases resolve.
  - **sdk/core/src/migrate.rs**: emit UUID `$ref` via `global_name_to_uuid`;
    add `MigrateSummary.dangling_alias_refs` counter.
  - **sdk/core/src/legacy.rs**: denormalize UUID `$ref` → `{name}` via
    `global_uuid_to_name` so legacy output is byte-semantically identical.
  - **sdk/core/src/validate/rules/spec001–003,015,042**: route alias lookups
    through `resolve_alias_key` for correct UUID resolution.
  - **packages/tokens/schemas/token-types/alias.json**: accept `value: "{name}"`
    (legacy) or `$ref: "<uuid>"` (cascade) via `oneOf`.
  - **packages/design-data-spec/schemas/token.schema.json**, **spec/token-format.md**:
    document UUID as the cascade canonical `$ref`; activate the reserved direction.

- [#1113](https://github.com/adobe/spectrum-design-data/pull/1113) [`e23264e`](https://github.com/adobe/spectrum-design-data/commit/e23264e681c56077b5582bf019123b941862779a) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix stale `replaced_by` UUIDs and re-enable cascade token validation in CI.
  - **`packages/design-data/tokens/`**: corrected 70 deprecated tokens whose `replaced_by`
    (and co-located `$ref`) fields held legacy scale-set wrapper UUIDs that no longer exist
    in the cascade dataset. Targets are now remapped to the correct cascade-format UUIDs via
    `set_uuid` lookup + scale matching.
  - **`packages/design-data/moon.yml`**: removed `runInCI: false` from the `validate` task
    now that SPEC-010 errors are resolved.
  - **`sdk/core/src/validate/rules/spec018.rs`**: SPEC-018 now skips when no component
    catalog is loaded (empty graph), matching the intended semantics — the rule cannot
    validate component references against a catalog that was not provided.
  - **`packages/design-data-spec/conformance/invalid/SPEC-018/dataset.json`**: updated
    fixture to use a non-empty component catalog so SPEC-018 fires for the right reason
    (referenced component not in the declared catalog).

- [#1113](https://github.com/adobe/spectrum-design-data/pull/1113) [`e23264e`](https://github.com/adobe/spectrum-design-data/commit/e23264e681c56077b5582bf019123b941862779a) Thanks [@GarthDB](https://github.com/GarthDB)! - Move Spectrum registry vocabulary into spectrum-design-data; deprecate design-system-registry.
  - **@adobe/spectrum-design-data**: gains `registry/` (27 vocabulary files) with
    subpath exports (`./registry/*.json`); now the single source of truth for all Spectrum data.
  - **@adobe/design-system-registry**: reduced to a compatibility shim. Migrate imports to
    `@adobe/spectrum-design-data` — this shim will be removed in a future major version.
  - **@adobe/design-data-spec**: gains `registry-value.json` and `platform-extension.json`
    schema exports; `manifest.schema.json` `conceptOrder` enum relaxed to open `string` type
    (no longer hardcodes Spectrum's field names — configurable per field catalog).

## 1.5.0

### Minor Changes

- [#971](https://github.com/adobe/spectrum-design-data/pull/971) [`d12173a`](https://github.com/adobe/spectrum-design-data/commit/d12173abf2915df5b1dae02ef000dae769ba4b66) Thanks [@GarthDB](https://github.com/GarthDB)! - Semantic alias foundation: SPEC-042 alias-target-domain + icon-color alias pilot.
  - **SPEC-042** (`sdk/core`): alias tokens now inherit domain from their target schema.
    A color alias carrying `colorFamily` is valid when its alias chain resolves to a
    color-domain schema (`color.json`, `color-set.json`).
  - **taxonomy.md**: new "Alias / semantic token name objects" section documenting the
    alias-target-domain rule with examples.
  - **icons.json**: 20 alias tokens gain `name` — 4 hue-background, 12 hue-primary,
    3 semantic primary, 1 disabled-primary. 3 polarity tokens deferred (RFC pending).
  - **token-corpus-migrate**: alias.json dispatch + 4 new `iconColorNameForKey` patterns.

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

### Patch Changes

- [#972](https://github.com/adobe/spectrum-design-data/pull/972) [`e9974fb`](https://github.com/adobe/spectrum-design-data/commit/e9974fb7360e849e928b31518b073996b49ecd6b) Thanks [@GarthDB](https://github.com/GarthDB)! - Move token `name` objects out of @adobe/spectrum-tokens into a new private
  @adobe/token-names sidecar package.
  - **@adobe/spectrum-tokens**: 497 inline `name` objects removed from
    color-palette.json, icons.json, typography.json. Token data otherwise identical.
  - **@adobe/token-names** (private, new): sidecar package mirroring tokens/src
    layout; depends on @adobe/spectrum-tokens via workspace:\*.
  - **sdk/core**: `TokenGraph::from_json_dir_with_names` merges sidecar names at
    ingest; existing rules unchanged. CLI gains `--names-dir` flag.
  - **token-corpus-migrate**: writes nameMap to sidecar dir, not inline to tokens.

## 1.4.0

### Minor Changes

- [#961](https://github.com/adobe/spectrum-design-data/pull/961) [`cb48b36`](https://github.com/adobe/spectrum-design-data/commit/cb48b36bc7682e790e4b7c51ca157f58150fd462) Thanks [@GarthDB](https://github.com/GarthDB)! - Add normative color, typography, and motion token taxonomies (closes issue #942).
  - **spec/taxonomy.md**: four subsections under "Token-type taxonomies" — semantic/layout
    (existing), color, typography, motion; each with a field table and serialization order.
  - **spec/token-format.md**: split semantic fields table into universal and domain-scoped.
  - **fields/**: 6 new declarations (`colorFamily`, `family`, `weight`, `style`,
    `motionRole`, `easing`) with domain `scope`; `scaleIndex` position moved to 99.
  - **registry/**: 6 new value files for color families, typography families/weights/styles,
    and motion roles/easing curves (motion entries provisional).
  - **SPEC-042** (`field-scope-violation`, warning): domain-scoped field on wrong token type.
  - **SPEC-043** (`domain-required-fields`, warning): color/typography/motion token missing
    a domain-identifying field; advisory severity, does not block the existing corpus.
  - Conformance fixtures for SPEC-042 and SPEC-043.
  - `docs/rfc-coordination.md`: RFC #806 future-taxonomies question resolved.

## 1.3.0

### Minor Changes

- [#958](https://github.com/adobe/spectrum-design-data/pull/958) [`c5bd47e`](https://github.com/adobe/spectrum-design-data/commit/c5bd47e72c59c7b4132464af6b6f39864a77704d) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): add `modeSetRestrictions` to platform manifest and SPEC-041 coverage rule

  Platforms can now declare which mode values are valid in a given mode set via the optional
  `modeSetRestrictions` manifest field (e.g. iOS restricting `colorScheme` to `["light"]`).
  The cascade resolver filters restricted candidates before context matching (step 0 of the
  resolution algorithm). SPEC-041 (`mode-set-restriction-coverage`) enforces that every token
  group has at least one candidate surviving all restrictions simultaneously, and reports
  unknown mode set names and missing defaults as separate sub-diagnostics.

## 1.2.0

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

- [#950](https://github.com/adobe/spectrum-design-data/pull/950) [`a8dacbc`](https://github.com/adobe/spectrum-design-data/commit/a8dacbc3572f4e16da518707393a22d21d73272b) Thanks [@GarthDB](https://github.com/GarthDB)! - **SPEC-040 `component-option-field-valid` (Warning, Layer 2)**: token name-object keys
  that match a declared `options.<key>` with a `values[]` list are now cross-validated
  against that list. This generalises SPEC-019 (which covers `variant` at Error severity)
  to all remaining option-enum fields — `style`, `size`, `staticColor`, and any future
  component option with a declared `values` array.

  The rule is advisory (Warning) so datasets can absorb the new check incrementally.
  Tokens using option values not yet declared in `components/*.json` will emit warnings
  rather than errors. Promotion to Error is deferred until the option catalog stabilises.

  **Migration:** if your component declares `options.style.values` and your tokens
  reference `name.style`, ensure the style values in use appear in the declared `values`
  list. The warning message identifies the token, field, and undeclared value.

## 1.1.0

### Minor Changes

- [#936](https://github.com/adobe/spectrum-design-data/pull/936) [`d387252`](https://github.com/adobe/spectrum-design-data/commit/d3872520226ffe20fb8eda1e6bfc60f2fc4f3435) Thanks [@GarthDB](https://github.com/GarthDB)! - **Spec:** Lift manifest query notation from deferred to normative (RFC #715 / SPEC-039).

  `spec/manifest.md` previously instructed implementations to treat `include`/`exclude` entries as
  opaque identifiers. That clause is now removed: each entry MUST parse as a valid query expression
  per `spec/query.md` and MUST use only the supported query keys.

  New Layer 2 rule SPEC-039 (`manifest-query-parseable`) enforces this at validation time by calling
  the same parser used by the `query` and `diff --filter` CLI subcommands. Parse failures report the
  failing entry's instance path and the query parser's error message to guide migration.

  **Migration:** If your manifest uses non-query strings in `include`/`exclude`, update them to the
  query notation defined in `spec/query.md`. The SPEC-039 diagnostic reports the exact position and
  key that failed, so running `validate` against your manifest will surface any entries that need
  updating.

## 1.0.0

### Major Changes

- [#932](https://github.com/adobe/spectrum-design-data/pull/932) [`0f256ce`](https://github.com/adobe/spectrum-design-data/commit/0f256ce0d067c87503979676d09cb4de7e904321) Thanks [@GarthDB](https://github.com/GarthDB)! - **Breaking:** Replace `optionDescriptor.enum` + `deprecatedEnumValues` with a
  structured `values` array.

  Each entry in `values` is an `optionValue` object (`{ value, description?, lifecycle? }`),
  eliminating the key-drift hazard that existed when `deprecatedEnumValues` could reference
  values absent from `enum`.

  Migration: convert `"enum": ["a", "b"]` to
  `"values": [{"value": "a"}, {"value": "b"}]`. Any `deprecatedEnumValues` entries fold into
  the matching `values[].lifecycle` object.

  SDK rules updated: SPEC-019 (`component-variant-valid`) reads `values[].value` instead of
  `enum[]`; SPEC-037 (`sub-entity-deprecation-cascade`) reads `values[].lifecycle.deprecated`
  for the option-value cascade.

## 0.15.0

### Minor Changes

- [#930](https://github.com/adobe/spectrum-design-data/pull/930) [`4e8ad86`](https://github.com/adobe/spectrum-design-data/commit/4e8ad86998b0e168396badb8a2a12207ebf535ae) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-037 (`sub-entity-deprecation-cascade`) advisory rule: warn when a non-deprecated
  token references a deprecated anatomy part, deprecated component state, or deprecated
  option-enum value via its `name` object. Schemas extended to allow `lifecycle` on anatomy
  parts and states, and `deprecatedEnumValues` on option descriptors.

## 0.14.0

### Minor Changes

- [#928](https://github.com/adobe/spectrum-design-data/pull/928) [`1849738`](https://github.com/adobe/spectrum-design-data/commit/1849738b1a65d2656280aa7777d1169fcc3f036b) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-036 (`component-deprecation-cascade`) advisory rule: warn when a
  non-deprecated token references a component declaration marked deprecated
  via `lifecycle.deprecated`. Closes the deprecation-cascade open question
  on rfc-coordination rows #735 / #832.

## 0.13.0

### Minor Changes

- [#924](https://github.com/adobe/spectrum-design-data/pull/924) [`20bb703`](https://github.com/adobe/spectrum-design-data/commit/20bb7035ad7d62513670bfb393b70766a295e51c) Thanks [@GarthDB](https://github.com/GarthDB)! - Expand canonical accessibility role vocabulary with `progressbar`, `meter`,
  `grid`, `listitem`, and `group` (issue #892, RFC-B Phase 7 follow-on).
  - `spec/accessibility.md` — 5 new rows added to the canonical role vocabulary
    table (21 total).
  - `spec/accessibility-adapters.md` — 5 new rows added to each platform mapping
    table (Web/ARIA, iOS, Android).
  - `components/meter.json` — `role: "meter"`, WCAG 4.1.2 added.
  - `components/progress-bar.json`, `progress-circle.json`,
    `in-field-progress-circle.json` — `role: "progressbar"`, WCAG 4.1.2 and
    4.1.3 added.
  - `components/table.json` — `role: "grid"` added.
  - `components/avatar-group.json`, `swatch-group.json`, `button-group.json` —
    `role: "group"` added.
  - `docs/rfc-coordination.md` — RFC-B open question for #892 marked resolved.

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

- [#924](https://github.com/adobe/spectrum-design-data/pull/924) [`20bb703`](https://github.com/adobe/spectrum-design-data/commit/20bb7035ad7d62513670bfb393b70766a295e51c) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-035 (`anatomy-part-name-registry-sync`) advisory warning rule.

  Fires when a component anatomy part's `name` is not in the `anatomy-terms.json`
  registry from `@adobe/design-system-registry`. Sibling of SPEC-034
  (`component-category-registry-sync`) for the anatomy-terms vocabulary.
  - `rules/rules.yaml` — adds SPEC-035 (severity: warning, category: naming-consistency)
  - SDK: new `spec035.rs` rule using the existing `for_field("anatomy")` accessor on
    `RegistryData`
  - `spec/anatomy-format.md` — extends SPEC rules table; adds note pointing to registry as
    authoritative vocabulary
  - `spec/registry.md` — adds SPEC-035 to the "Validated by" line for `anatomy-terms.json`
  - `docs/rfc-coordination.md` — marks anatomy-part name registry-sync gap as resolved
  - Conformance fixtures: `conformance/valid/SPEC-035/` and `conformance/invalid/SPEC-035/`

## 0.12.0

### Minor Changes

- [#921](https://github.com/adobe/spectrum-design-data/pull/921) [`b98a17d`](https://github.com/adobe/spectrum-design-data/commit/b98a17dfeaff24bf1bc17d0705c1ff9ce734f7d7) Thanks [@GarthDB](https://github.com/GarthDB)! - Expand canonical accessibility role vocabulary with `progressbar`, `meter`,
  `grid`, `listitem`, and `group` (issue #892, RFC-B Phase 7 follow-on).
  - `spec/accessibility.md` — 5 new rows added to the canonical role vocabulary
    table (21 total).
  - `spec/accessibility-adapters.md` — 5 new rows added to each platform mapping
    table (Web/ARIA, iOS, Android).
  - `components/meter.json` — `role: "meter"`, WCAG 4.1.2 added.
  - `components/progress-bar.json`, `progress-circle.json`,
    `in-field-progress-circle.json` — `role: "progressbar"`, WCAG 4.1.2 and
    4.1.3 added.
  - `components/table.json` — `role: "grid"` added.
  - `components/avatar-group.json`, `swatch-group.json`, `button-group.json` —
    `role: "group"` added.
  - `docs/rfc-coordination.md` — RFC-B open question for #892 marked resolved.

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

## 0.11.0

### Minor Changes

- [#918](https://github.com/adobe/spectrum-design-data/pull/918) [`e77379b`](https://github.com/adobe/spectrum-design-data/commit/e77379b24b3d66b09ce78b4cf20e2d15cefbe78b) Thanks [@GarthDB](https://github.com/GarthDB)! - docs(spec): add registry.md formalizing three-registry boundary and single-package strategy

## 0.10.0

### Minor Changes

- [#889](https://github.com/adobe/spectrum-design-data/pull/889) [`8726a99`](https://github.com/adobe/spectrum-design-data/commit/8726a991f01f08e57c3545e5bb9274fab12f96b0) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): accessibility.schema.json + component schema wiring (Phase 7.3)

- [#890](https://github.com/adobe/spectrum-design-data/pull/890) [`0650e39`](https://github.com/adobe/spectrum-design-data/commit/0650e39335edebfbefbadf7c39fb1cc399fa211e) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): SPEC-030/031 accessibility validation rules (Phase 7.4)

- [#891](https://github.com/adobe/spectrum-design-data/pull/891) [`9932351`](https://github.com/adobe/spectrum-design-data/commit/99323513890abb3ddad93f1394c756bf56526f27) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): add accessibility declarations to all foundation components (Phase 7)

## 0.9.0

### Minor Changes

- [#886](https://github.com/adobe/spectrum-design-data/pull/886) [`0710522`](https://github.com/adobe/spectrum-design-data/commit/071052225694d1442a3bdc8094f2a67f9a24277f) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): accessibility vocabulary for component declarations (Phase 7.1)

## 0.8.0

### Minor Changes

- [#877](https://github.com/adobe/spectrum-design-data/pull/877) [`d0297f0`](https://github.com/adobe/spectrum-design-data/commit/d0297f0042404a4e6381009ce80849c781f8db49) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): document blocks — typed prose for tokens, components, and anatomy (Phase 9)

## 0.7.0

### Minor Changes

- [#863](https://github.com/adobe/spectrum-design-data/pull/863) [`0e30511`](https://github.com/adobe/spectrum-design-data/commit/0e30511ec5ce916b76b97d116459a6421f0ddd4e) Thanks [@GarthDB](https://github.com/GarthDB)! - Phase 8.x: product context document
  - New spec chapter `spec/product-context.md` — defines the Layer 3 product context document:
    rationale, overrides, extensions, and agent capture behavior.
  - New schema `schemas/product-context.schema.json` — validates product-context.json documents.
  - `spec/cascade.md` — note on product context in the layers table.
  - `spec/manifest.md` — cross-reference to product context.
  - `spec/agent-surface.md` — add `write_token` and `write_component` to tool catalog (RECOMMENDED);
    note on rationale capture behavior.
  - `spec/index.md` — add product context to normative references.
  - `design-data write` CLI subcommand — creates or updates a product-context.json file; accepts
    `--output` (path) and `--rationale` (text) flags.

### Patch Changes

- [#863](https://github.com/adobe/spectrum-design-data/pull/863) [`0e30511`](https://github.com/adobe/spectrum-design-data/commit/0e30511ec5ce916b76b97d116459a6421f0ddd4e) Thanks [@GarthDB](https://github.com/GarthDB)! - Phase 1.x: add optional `rationale` string field to token schema
  - `schemas/token.schema.json`: add `rationale` to both `tokenWithValue` and `tokenWithRef`
    properties. Field is OPTIONAL; no validation rules.
  - `spec/token-format.md`: add `rationale` row to the lifecycle and metadata table.

## 0.6.0

### Minor Changes

- [#860](https://github.com/adobe/spectrum-design-data/pull/860) [`fd06340`](https://github.com/adobe/spectrum-design-data/commit/fd063404ebef790f37887611572a8ae1e49dc053) Thanks [@GarthDB](https://github.com/GarthDB)! - Phase 6.7: token binding declarations
  - Add optional `tokenBindings` array to component declarations (`component.schema.json`): lists
    tokens a component uses, including foundation/structure tokens not scoped to the component in
    their name-object. Each entry has a required `token` (name string) and optional `context` (Figma
    Group label).
  - Add optional `componentBindings` array to token declarations (`token.schema.json`): reverse index
    of `tokenBindings`; informative and derivable from component files.
  - Add SPEC-027 (`token-binding-token-exists`): each `tokenBindings[].token` MUST match a declared
    token name in the dataset.
  - Add conformance fixtures for SPEC-027 (`conformance/invalid/SPEC-027/`,
    `conformance/valid/token-bindings.json`).
  - Extend `spec/component-format.md` with Token bindings section and updated SPEC rules table.
  - Add `componentBindings` section to `spec/token-format.md`.
  - Update `describe_component` return shape in `spec/agent-surface.md` to include `tokenBindings`.
  - Seed `tokenBindings` on 58 component files from spec-snoop Figma extraction data.

## 0.5.0

### Minor Changes

- [#858](https://github.com/adobe/spectrum-design-data/pull/858) [`38127f5`](https://github.com/adobe/spectrum-design-data/commit/38127f556435783f31ab54c11d1ec6c93da17813) Thanks [@GarthDB](https://github.com/GarthDB)! - Phase 6.7: token binding declarations
  - Add optional `tokenBindings` array to component declarations (`component.schema.json`): lists
    tokens a component uses, including foundation/structure tokens not scoped to the component in
    their name-object. Each entry has a required `token` (name string) and optional `context` (Figma
    Group label).
  - Add optional `componentBindings` array to token declarations (`token.schema.json`): reverse index
    of `tokenBindings`; informative and derivable from component files.
  - Add SPEC-027 (`token-binding-token-exists`): each `tokenBindings[].token` MUST match a declared
    token name in the dataset.
  - Add conformance fixtures for SPEC-027 (`conformance/invalid/SPEC-027/`,
    `conformance/valid/token-bindings.json`).
  - Extend `spec/component-format.md` with Token bindings section and updated SPEC rules table.
  - Add `componentBindings` section to `spec/token-format.md`.
  - Update `describe_component` return shape in `spec/agent-surface.md` to include `tokenBindings`.
  - Seed `tokenBindings` on 58 component files from spec-snoop Figma extraction data.

## 0.4.0

### Minor Changes

- [#855](https://github.com/adobe/spectrum-design-data/pull/855) [`c9002db`](https://github.com/adobe/spectrum-design-data/commit/c9002db2da1d1bb40446b4991648dc7809a55f33) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(component-schemas): migrate source of truth to design-data-spec components

  `@adobe/spectrum-component-api-schemas` is now a thin adapter over
  `@adobe/design-data-spec/components/`. All 80 component declarations have been
  converted to the new format and live in `packages/design-data-spec/components/`.

  The API surface is unchanged: `getAllSchemas()`, `getAllSlugs()`,
  `getSchemaBySlug()`, `getSchemaFile()`, and `schemaFileNames` all behave
  identically. Returned objects now include new fields (`name`, `displayName`,
  `options`, `states`, `lifecycle`) alongside the existing aliases (`title`,
  `properties`, `slug`) — no consumer breakage.

  `@adobe/design-data-spec` minor: 79 component declarations added to
  `components/`. `optionDescriptor` in `component.schema.json` now allows
  additional JSON Schema keywords (`pattern`, `minimum`, `items`, etc.)
  to accommodate real-world component option descriptors.

## 0.3.0

### Minor Changes

- [#853](https://github.com/adobe/spectrum-design-data/pull/853) [`e4b9656`](https://github.com/adobe/spectrum-design-data/commit/e4b9656bead7b9513c9df42f30ff32b8a70d4568) Thanks [@GarthDB](https://github.com/GarthDB)! - Add Layer 2 cross-reference validator implementing SPEC-018–024, conformance fixtures,
  and a reference button component declaration. Export new component, anatomy-part, and
  state-declaration schemas from the package.

## 0.2.0

### Minor Changes

- [#837](https://github.com/adobe/spectrum-design-data/pull/837) [`29531ee`](https://github.com/adobe/spectrum-design-data/commit/29531ee2a9935922bab329c26edce1de8489a423) Thanks [@GarthDB](https://github.com/GarthDB)! - Add composite token support (Proposal 010). Introduces a `$valueType` field for
  declaring a token's value-type schema. Defines three composite value-type schemas
  (`typography`, `drop-shadow`, `typography-scale`) under `schemas/value-types/`.
  Adds inline alias reference rules and three new validation rules (SPEC-014,
  SPEC-015, SPEC-016). No breaking changes — `$valueType` is optional.

- [#837](https://github.com/adobe/spectrum-design-data/pull/837) [`29531ee`](https://github.com/adobe/spectrum-design-data/commit/29531ee2a9935922bab329c26edce1de8489a423) Thanks [@GarthDB](https://github.com/GarthDB)! - Add string-name escape hatch (Proposal 011). Allows a token's `name` to be
  a plain string when the structured taxonomy cannot express it. String-named
  tokens are schema-valid but trigger SPEC-017 (severity: warning,
  category: tech-debt), making tech debt visible and trackable. No breaking
  changes — all existing name-object tokens are unaffected.

## 0.1.1

### Patch Changes

- [#824](https://github.com/adobe/spectrum-design-data/pull/824) [`7ee19ea`](https://github.com/adobe/spectrum-design-data/commit/7ee19eae92051564f605497bd4ac4bf9a6f259fe) Thanks [@GarthDB](https://github.com/GarthDB)! - Reconcile spec with RFC discussion family.
  - Add `lastModified` lifecycle field on tokens (originally proposed in RFC #623,
    missed during initial implementation). Records the spec version when a token's
    value or non-formatting metadata last changed. Validated by new rule
    `SPEC-014: lastModified MUST NOT precede introduced`.
  - Clarify in `manifest.md` that the query notation defined in `spec/query.md` is
    normative for programmatic use; manifest `include`/`exclude` adoption is
    deferred to a post-`1.0.0-draft` revision.
  - Add a worked `card`-as-`structure`-vs-`component` example to `taxonomy.md` to
    disambiguate scope decisions.
  - Replace open-ended "additional taxonomies will be defined" sentence with a
    pointer to the open RFC discussion (#806 Q3).
  - Update legacy-format mapping table in `evolution.md` to note `lastModified`
    has no legacy equivalent.

  All changes are additive or clarifying; no token data or existing rule semantics
  change.

## 0.1.0

### Minor Changes

- [#810](https://github.com/adobe/spectrum-design-data/pull/810) [`4a55a5f`](https://github.com/adobe/spectrum-design-data/commit/4a55a5f2b027d7df73852cb62dd633bd5da17c93) Thanks [@GarthDB](https://github.com/GarthDB)! - Add taxonomy registries and expand token name object schema.
  - Split `anatomy-terms.json`: removed styling surfaces and positional terms
  - Added `token-objects.json` (background, border, edge, visual, content)
  - Added 6 new taxonomy registries:
    structures, substructures, orientations, positions, densities, shapes
  - Exported all 7 new registries from package index
  - Added all 13 semantic fields explicitly to `nameObject` in
    `token.schema.json`, distinguishing semantic from dimension fields

## 0.0.1

### Patch Changes

- [#738](https://github.com/adobe/spectrum-design-data/pull/738) [`880b365`](https://github.com/adobe/spectrum-design-data/commit/880b3650c297612b25d1b9ee1a01aa49abbacdd7) Thanks [@GarthDB](https://github.com/GarthDB)! - Add draft Design Data Specification prose (`1.0.0-draft`), v0 JSON Schemas,
  validation rule catalog (SPEC-001–SPEC-006), and conformance fixtures.
