---
name: taxonomy-vocabulary
description: How the Registry (taxonomy) works in spectrum-studio. Use when touching token names or classification, taxonomy categories or terms, the Registry page, how a foundation names its scales or sources, term contributions from foundations, governed or evidence-based classification, the proposed classification standard, variant or size vocabulary, or any code that builds a name from vocabulary. Covers the document model, how a name is projected, who governs a token's classification, edit rules, and known debt.
---

# Taxonomy and vocabulary (the Registry)

Code: `src/features/taxonomy/`. UI: `src/pages/Registry.tsx`, `src/panels/registry/`
(`TaxonomyEditor`, `SourceNameEditor`), `src/views/registry/TaxonomyView.tsx`. Roadmap: INIT-3 (EPIC-3.1 to
3.4, planned), EPIC-7.4 (1:1 with design-data). Roadmap principle 1: terms are clear, non-conflicting
and non-duplicative, and new concepts reuse the taxonomy instead of inventing parallel vocabulary.

**Vocabulary.** The UI and its messages say **Registry** ("Choose an available Registry category"); the
code says `taxonomy`. Use "Registry" in UI text and `taxonomy` in code; do not rename either.

## The document (`taxonomy/model.ts`)

- **Categories**: `id` (UUID v4, pattern enforced), a camelCase `key` bound to a field, `name`,
  `valueType` (`string` or `number`), `cardinality` (`one` or `ordered`), `scopes` (colors,
  typography, elevation, structures, spacing, size, radius), `required`, `includeInProjections`.
- **Terms**: `id` (UUID v4), `categoryId`, a typed `value`, `description`.
- `order`: the global category order, containing every category exactly once.
- `classifications`: `{ [sourceId or tokenId]: { [categoryId]: termId } }`.
- A value (trimmed, case-folded) belongs to one category, except numeric sharing such as `scaleIndex`
  (`valueDomains.ts`).
- Taxonomy ids are random UUIDs (`crypto.randomUUID()`), generated once and stored. That is the
  pattern to follow for any new identity (see `tokens`, DEBT-017).

## A name is a projection

`projectClassification(document, classification, scope)` builds the name: the assigned terms in
`order`, for categories with `includeInProjections`, serialized kebab-case. Names are never stored or
typed. Problems (an unknown category, a missing required category, an unresolved term, a collision) are
returned as `projection.issues`; they are not thrown. Wrap batches in `withTaxonomyProjection` so
indexes are reused.

## Who decides a token's classification (`resolveSourceClassification`)

1. **Governed** by a foundation: the foundation fixes type, name and step
   (`governedFoundationContext`, `colorGovernance.ts`, `foundationNames.ts`). A manual classification
   on a governed token is reported as an issue to remove. Scales, metrics, surfaces and data-vis
   members are governed.
2. **Explicit**: the user assigned terms on the token.
3. **Evidence**: the generator supplies evidence (property, color name, scale index) and it resolves to
   registered terms; unmatched evidence reports "Unmapped X: review and select a registered term".

## Source names and contributions

- A foundation source's name is a `TaxonomyNameReference` (`categoryId`, `termId`, optional explicit
  `classification`). Labels are never parsed. `resolveNamedSource`, `reconcile*SourceNames` and
  `assertRegisteredSourceNames` (`naming.ts`) keep names in step with the Registry.
- Foundation edits register terms automatically (`contributeTerms`, `withTaxonomyContributions` in
  `contributions.ts`): a new color scale's name joins its category. Disable only through
  `taxonomyContributionsEnabledAtom`.
- A new foundation or token type that needs names must register its category and terms through this
  path, add a governance context, and add its scope to `TaxonomyScope`. Follow `authoring-lifecycle`.

## Edit rules (`updateTaxonomy`, `registerTerm`)

Enforced as edit-time rejections, which are intended validation:

- Category and term identities are immutable. Add and remove are separate changes.
- A category's `key` (its field mapping) is immutable; rename without changing it.
- Term ownership is immutable: remap references before removing a term.
- Changing a category's type or cardinality needs referenced classifications remapped first.
- Only `cardinality: "one"` is editable. Imported `ordered` assignments must be reviewed, not silently
  edited or dropped.
- A value already owned by another category cannot be registered; explicit remapping is required.

`computeTaxonomyValidation` (`referenceValidation.ts`) runs the whole-system check for a draft edit in
a worker and returns valid or invalid with a message; use it instead of throwing from UI code.

## Classification standard and reviewed exports

`src/data/classification-standard.json` is a proposed shared classification standard
(`spectrum-classification-v1-proposed`, LTAX-011). `standardization.ts` assesses categories and terms
against it, and `reviewedExport.ts` and `generatedReviewExport.ts` build hashed review exports (profile
`leonardo-flat-taxonomy-v1`). These are pinned evidence: do not edit, re-hash or re-pin them to make a
check pass. Follow `design-data-contract`.

## Variant vocabulary

`variantVocabulary.ts` holds the fixed ids for component size terms (`SIZE_TERM_IDS`) and variant
categories. T-shirt rules and structures reference them by id (`formula-engine`, structures).
`upgradeVariantVocabulary` adds absent entries and never replaces conflicting identities or authored
labels.

## Known debt and what not to copy

Open items are in `docs/known-debt.md`. Follow Working rule 5 in `AGENTS.md`. Do not copy a name that
is typed or parsed from a label, a second source of terminology, or a throw on load or restore for
taxonomy problems (return issues instead; DEBT-024).

## Checks

`test:taxonomy`, `test:taxonomy-order`, `test:taxonomy-identity`, `test:taxonomy-sources`,
`test:canonical-names`, `test:classification`, `test:registry-projection`, `test:taxonomy-projection`;
`test:design-data-gaps` when the register changes. Browser: `taxonomy.spec.ts`,
`taxonomy-editing.spec.ts`, `taxonomy-sources.spec.ts`, `taxonomy-defaults.spec.ts`, with `pageerror`
asserted empty (`verify-change`).
