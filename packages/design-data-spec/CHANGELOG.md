# @adobe/design-data-spec

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
