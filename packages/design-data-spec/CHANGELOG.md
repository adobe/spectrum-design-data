# @adobe/design-data-spec

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
