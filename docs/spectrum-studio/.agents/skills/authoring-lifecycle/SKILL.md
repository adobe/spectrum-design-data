---
name: authoring-lifecycle
description: Wire an editable design-data domain into saving, the Changes (changelog) system, and Impact in spectrum-studio. Use whenever adding or changing a foundation (color, typography, spacing, size, radius, elevation, motion), a collection (structures, components, rules, modes, taxonomy), a token source, or any persisted authored field. Gives the ordered checklist, what is machine-enforced versus convention, the impact-propagation questions, and the required cascade test.
---

# Authoring lifecycle: persist, Changes, Impact

First apply [parametric-systems-design](../../../../../.ai/skills/parametric-systems-design/SKILL.md)
to identify the data owner, references, and shared derivation path before wiring storage.

Read first: `.agents/rules/changelog-parity.mdc` and the Cross-component
validation section of `AGENTS.md`. This skill is the procedure; those hold the
policy. Ask the user minimum versus architecture slice before building a
roadmap-sized feature (AGENTS.md, Roadmap alignment).

## Development browser compatibility

Follow `AGENTS.md`, Working rule 7: reset incompatible local browser state to
current shipped defaults without asking to preserve local edits. Use the existing
storage-version, restore and Reset all paths. Do not add preservation migrations
or backups unless the user requests them. Ordinary compatible editing still
requires Save/Cancel, Changes and scoped-reset behavior.

Startup does this automatically when the shipped defaults change. It stores a
fingerprint of `createDefaultSnapshot()` under `leonardo:authoring-defaults:v1`;
when a stored fingerprint differs and an authoring record exists, startup runs
Reset all silently, keeping view state. Records saved before the fingerprint
existed are stamped and kept.

## Two comparison paths: touch both

The repo has two parallel comparison paths. A new domain needs both.

- **New path:** `compareAuthoring` in `src/features/changelog/registry.ts`
  (`CHANGE_DOMAINS`). Feeds Impact slots (System, Foundations, Design,
  Components overviews).
- **Legacy path:** `src/features/changelog/state.ts` plus `changes.ts` and
  per-domain `changes.ts` files (for example `elevation/changes.ts`). Feeds the
  Changes cards and reverts.

## Checklist, in order

Use `radius` (collection-style) or `elevation` (document-style) as the working
example. V = enforced by a script or type; M = manual convention.

| # | Step | Where | Enforced | Check |
| --- | --- | --- | --- | --- |
| 1 | Schema and defaults | `src/data/design-system.schema.json`, `design-system.defaults.json`, `src/data/defaults.ts`, `src/features/<domain>/{model,defaults}.ts`. After adding default tokens, run `pnpm identities:defaults` to record their permanent IDs. Without them, Studio creates random IDs and Changes reports the shipped tokens as removed, even after Reset all | Schema shape hash (`scripts/check-changelog-coverage.ts`); `token-identities` check | `pnpm check:changelog-coverage`, `pnpm test:defaults`, `pnpm identities:defaults --check` |
| 2 | State atoms | `src/features/<domain>/state.ts` (dimension foundations use `createDimensionFoundationState`) | M | the domain's `test:*` |
| 3 | Snapshot key | `src/features/edit-session/state.ts`: `EditSessionSnapshot` field, `isSnapshot`, `captureSourceSnapshot`, `createDefaultSnapshot`, `restoreAuthoringSnapshotAtom` | V for the key (see 7). The other four sites are M | `pnpm typecheck` |
| 4 | Stored-data validation | `assertStoredSnapshot` in `edit-session/state.ts`. Review additive-field compatibility; incompatible development records follow Working rule 7 | M. **Do not add throw-on-load checks for reference differences** (AGENTS.md, Working rule 2). Return diagnostics instead | `pnpm test:persistence` |
| 5 | Storage compatibility | Review `AUTHORING_RECORD_VERSION` in `edit-session/storage.ts` and the restore/reset path in `persistence.ts`. Reset incompatible development state by default; add an upgrade only when preservation is explicitly requested | M. A reset must restore current working/saved defaults and leave compatible records and unrelated storage unchanged | the domain test, `test:persistence` |
| 6 | Mode attachments | `src/features/modes/foundationAttachments.ts` | M | `pnpm test:modes` |
| 7 | Changelog domain | `CHANGE_DOMAINS` entry in `changelog/registry.ts` (`topic`, `category`, `label`, `sourceKind`, optional `collection`, `identity`); `FOUNDATION_LABELS`; add the `sourceKind` to `FoundationKind` and `ChangeItem["sourceKind"]` in `changelog/changes.ts` | V: `satisfies Record<keyof EditSessionSnapshot, ...>`, `assertDomainCoverage`, `check:changelog-coverage` | `pnpm check:changelog-coverage`, `pnpm test:changelog` |
| 8 | Field extraction | The generic walker (`compareObject`) in `registry.ts`; `FIELD_EXCLUSIONS` for non-authored fields (needs a reason); legacy field lists (`SPACING_SCALE_FIELDS`, `elevationFields`) | M. A new field missing from a hand-kept list is **not** counted | `tests/changelog.ts`, `tests/changelog-parity.ts` |
| 9 | Previews and manual classification | `registry.ts` `previewKind` (hard-coded per foundation; a new foundation needs its own); manual versus generated rules; legacy preview map in `changes.ts`; `createValuePreview` | M | `pnpm test:value-preview` |
| 10 | Resets | `changelog/state.ts` restore branches; `resetPlans.ts` (`itemResetPlan`, `prepareChangeReset`, `generatedOverrideReason`, `lockedFormulaReason`); `contract.ts` `restorePath` | M | `tests/changelog-resets.ts` (in `test:changelog`) |
| 11 | Generated token diffs | `changelog/tokenComparison.ts` (token type to mode axes and source paths) | M | `tests/changelog-parity.ts` |
| 12 | Foundation impact source | `src/features/impact/sources/` (own file, or inline in `index.ts` as elevation does) **and** the `FOUNDATION_IMPACT_SOURCES` array; segment color in `impact/segments.ts` | Partly V: `check:changelog-coverage` fails if a `foundations`-topic domain's category does not appear in `impact/sources/` (a presence check; it does not prove the source is in `FOUNDATION_IMPACT_SOURCES`). Add a documented exemption in `scripts/check-changelog-coverage.ts` only with the user's approval | `pnpm check:changelog-coverage`, `pnpm test:impact` |
| 13 | Authored impact slots | Derived from `compareAuthoring().slots` once step 7 is done | Convention | `tests/changelog-parity.ts` |
| 14 | Token impact feed | `src/features/tokens/browserSavedState.ts` (`savedSources`, snapshot baseline), `tokens/aliasTargets.ts`, `tokens/browserModel.ts` type unions; `ImpactCategory` in impact | M | `pnpm test:tokens`, `pnpm test:token-aliases` |
| 15 | Taxonomy and design-data | `taxonomy/naming.ts`, `taxonomy/foundationNames.ts`, `design-data/*`; gap register entry (see `design-data-contract`) | Gap register is script-checked | `pnpm test:design-data-gaps` |
| 16 | Tests | Mutation, add/remove, exact counts and percentages, narrow resets, dependency rejection, Save/Cancel/reload, preview exclusion | n/a | `pnpm test:<domain>`, `pnpm test:changelog`, `pnpm test:impact` |
| 17 | UI | `src/pages/Foundations.tsx` tab, `src/panels/foundations/*`, `src/views/<domain>/*`. Use `component-catalog`. Add and delete buttons use `notify.added` and `notify.remove` with a `NOTIFICATION_KINDS` entry (see `notifications`) | M, plus `pnpm test:notifications` | one Playwright spec, with `pageerror` asserted empty (see `verify-change`) |
| 18 | Gate | `pnpm lint` once at the end | Script | |

Only the snapshot key, `CHANGE_DOMAINS`, the schema hash, and the
`sourceKind` unions are machine-enforced. Everything else will be silently
missed unless you do it. Do not update a pin or fingerprint to make a check
pass; that does not establish coverage.

## Impact propagation: answer these for every new domain

Expected behavior: editing a foundation value should move **System,
Foundations, Tokens, and Components** (to varying degrees).

1. **Changelog:** is it a `CHANGE_DOMAINS` entry with a snapshot key?
2. **Foundation impact:** is there a source, registered in
   `FOUNDATION_IMPACT_SOURCES`?
3. **Token impact:** do its generated tokens have a token type, a
   `TokenPanelId`, a `tokenPanelRegistry` entry, and a feed in
   `browserSavedState.ts`?
4. **Component impact:** see below. Computed automatically from component
   assignments; nothing to register per domain, but check it moves.

### Component impact (implemented)

Model, from the user: component impact is the number of assignments whose
effective value changed. One reference is low; 20 references to one token in a
single component is large. It scales across all component data (20 to 40
components expected).

Implemented in `src/features/impact/componentImpact.ts`, published by
`computeComparison` as `componentImpact`, shown in `ImpactOverview`, tested by
`pnpm test:component-impact`. Rules:

- The denominator is every assignment in every component, shipped or working
  (union), literal values included.
- An assignment is affected when it exists on one side only, or the value it
  resolves to (a literal, or the token it references in the component token
  list from `componentTokenCatalog`) differs between shipped and working.
- Every assignment counts, so repeated references to one token weigh more.
- If the component token list cannot be built, the result is `unavailable`,
  never zero.
- It uses the component token list, not the Token impact records: those cover
  only some of the tokens components reference.

A new foundation reaches components only if its generated tokens appear in
`componentTokenCatalog` (`src/features/components/references.ts`). If they do
not, add them there and extend `tests/component-impact.ts`.
`TokenImpactRecord.referencesAffectedToken` is still declared but never
assigned; do not rely on it.

Motion has no data, snapshot key, or tokens yet (`FoundationsMotionPanel.tsx`
returns `null`), so it has none of the four levels. Never say a domain has full
impact coverage. State which of the four levels exist and show each is covered.

### Required cascade test

For a new foundation or token source, add one test that edits a single
foundation value and asserts the impact counts move in every level that exists,
and that levels which do not exist are reported as unavailable, not zero. Real
sources are currently untested (`tests/impact.ts` uses synthetic records).

## Pitfalls

- Impact counts authored data only. Generated outputs belong in Token impact.
  Additions and removals use union identities. Do not count compatibility
  aliases or presentation samples as canonical token concepts.
- Selected modes and temporary previews never change inventories.
- Missing or invalid output is **unavailable**, not zero. Never silently reduce a
  percentage denominator.
- Ordinary scoped source resets must preserve unrelated edits. Generated resets need an
  explicit supported override. Never reset by display name; use the `id` or
  `conceptId`. Never guess a source or bypass a formula lock.
- Clearing token overrides must retain publication identity metadata, including
  the `sourceId`, `conceptId`, and allocated row UUIDs for inactive output. Use
  `resetTokenEdit` in `tokens/canonicalIdentity.ts` for individual and bulk token
  resets rather than deleting the whole edit record. A full reset to shipped
  defaults is separate and restores the shipped identities.
- Test that individual and bulk override resets remove the intended edits
  without changing publication IDs or breaking component and alias references.
  Identity metadata alone must not count as a manual edit, a Changes item, or
  changed Token impact.
- Mode-specific values: `modeSets` compares twice (as a set and per mode).
  Prune mode values on reset when layers are removed.
- Collections also compare document-level fields outside the collection.
- A schema-hash failure means review adapters, resets, and fixtures first.
- A new snapshot key needs a storage-version and restore review. Reset
  incompatible development records by default rather than adding a migration
  solely to preserve local browser edits.
- Elevation tokens are generated-only; direct overrides are rejected.

## Done means

Every checklist row has an answer (done, not applicable with a reason, or
explicitly deferred with the user's approval), the four impact levels are
stated, the cascade test exists, and the gap register is linked (see
`design-data-contract`).
