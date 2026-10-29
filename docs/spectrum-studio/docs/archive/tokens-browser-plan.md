# Unified token browser implementation plan

## Goal and scope

Replace the Tokens page SubPanels and ViewSwitcher with one searchable collection rendered as a hierarchical TableView or grouped CardView. Both presentations share data, filters, selection, details, and bulk actions. Inspiration images guide the information hierarchy, not the visual design.

Use a forward-compatible minimum supporting EPIC-4.4 and EPIC-7.1, with edit-session and changelog integration. Do not implement taxonomy, semantic tokens, publishing, or missing foundations. Preserve the roadmap principles: formula-first generation, visible/revertible overrides, one generation path, and design-data alignment.

## Approved decisions

- Include All and the existing Colors, Typography, Spacing, Size, Corner radius, Elevation, and Motion filters. Show icons and text.
- Preserve panel search: every whitespace-separated, case-insensitive term must match the group label, token name, or value.
- Start existing tokens as Draft. Released is reserved for future released/imported data and is not manually assignable. Local transitions are Draft to Deprecated and back.
- Enable name, description, and value overrides for generated color, typography, and spacing tokens. Missing foundations remain empty; never invent values.
- Value overrides apply to the active mode combination. Name, description, and status are token-concept metadata shared across modes.
- Preserve selection between list and grid. Clear selection when search/type changes or edit mode ends. Group checkboxes select all matching eligible token descendants, including collapsed children; stored selection contains only token IDs.
- Reject duplicate effective names within a token type. Direct name editing is temporary and does not implement taxonomy or generated name previews.
- Bulk values require compatible value kinds and units. Mixed incompatible selections permit status editing only.
- Deprecation needs secondary confirmation. Show newly deprecated saved concepts divided by all saved token concepts, with numerator, denominator, and percentage. Exclude already-deprecated tokens from the numerator; disclose unsaved additions separately.
- Grid sections follow the first ordered taxonomy segment, superseding the original first-hyphen-term grouping. Headings show term values without category prefixes; card names remain canonical.
- Dimensional previews retain exact pixel width when possible and clip oversized values inside a fixed preview area. Always show the exact numeric value.
- Add focused Storybook stories and the roadmap dependency notes.
- Upgrade to released compatible S2/RAC versions for native hierarchical tables. If the necessary API is unreleased, stop for a decision rather than silently substituting custom tree behavior.

## Phase 1: Collection foundation

1. Verify native TableView hierarchy in published packages, then update compatible S2/RAC dependencies and the lockfile. Validate existing UI before proceeding. Do not change the react-spectrum workspace.
2. Extend the shared token view model and adapters. Retain raw typed values, stable concept IDs, type, source group, name, preview, effective value, lifecycle status, description, and edit capabilities. Alias is empty. Reuse tokenPanelRegistry, primitive adapters, and existing search semantics.
3. Resolve generated values once, apply overrides, and filter one collection. Table hierarchy follows ordered taxonomy segments, compacts single-child chains, and puts each token on its terminal classification row. Search expands matching branches without replacing normal expansion state.

## Phase 2: Persistent editing

4. Apply token overrides after generation, not as foundation formula edits. Preserve legacy color identities and global overrides as fallbacks. New value overrides use canonical active-mode combinations built from stable mode-set/mode IDs. Precedence is exact-combination override -> legacy fallback -> generated value. No partial-combination inheritance.
5. Persist names, descriptions, and Draft/Deprecated metadata. Validate names and typed values; reuse color parsing and domain/unit constraints. Store generated baselines for stale tracking and revert. Metadata-only edits must not classify generated values as manually overridden.
6. Extend edit-session snapshots, Save, Cancel, changelog source detection, individual revert, and system-wide concept/mode-value counts. Temporary adaptive previews are not saved changes. Handle deleted tokens/modes without applying orphaned overrides to different identities. Keep componentSize in typography until EPIC-2.5; spacing remains decoupled from text zoom.

## Phase 3: Unified page and editing surfaces

7. Replace page composition with a SearchField, icon-and-label single-select type controls using the existing action-button tab treatment, and an icon-only list/grid toggle with accessible names/tooltips. SubPanelTabs currently uses styled React Aria tabs; the requested ActionGroup corresponds to supported S2 button-group controls, not an API named ActionGroup.
8. Implement one native hierarchical TableView with Name, Preview, Value, Status, Alias, Description, and Actions columns. Eligible token rows and their parent groups have edit-mode checkbox multi-selection. Parent checkboxes show partial selection. Open shows details; See impact is a clearly unavailable placeholder. Lifecycle badges are separate from stale/override indicators.
9. Implement one grouped CardView renderer with name, preview, value, and status. Card activation opens details in both modes. Edit-mode checkbox selection does not open details. Section collections use one controlled selection set and one page-level ActionBar.
10. Implement a shared standard details dialog using existing S2 Dialog/DialogTrigger patterns. Show source, generated/effective values, metadata, override indicators, and mode scope. Names, descriptions, values, and status are editable only in edit mode. Save validates and commits atomically; Cancel discards the draft. A mode change cannot silently retarget an open draft.
11. Show a bottom ActionBar whenever selection is nonempty. Bulk edit opens a shared dialog with Value and Status; untouched fields remain unchanged. Deprecation opens secondary confirmation with the count-based impact calculation. Commit all selected changes atomically after validation/confirmation; Cancel writes nothing. Actual dependency analysis is deferred.

## Presentation and accessibility

- Small color swatches; fixed-size dimensional preview cells with safe clipping. Handle zero values and long names without layout shifts.
- Honest empty states for missing types and search results. Keep unavailable alias/dependency features explicit rather than fabricating content.
- Desktop/mobile layout, horizontal table scrolling where needed, wrapping toolbar controls, and no ActionBar overlap with final rows/cards.
- Keyboard hierarchy navigation, checkbox selection, clear accessible labels, focus restoration, modal Escape behavior, and light/dark theme coverage.

## Critical implementation surfaces

All paths are under /Users/nbaldwin/Documents/Protopack/spectrum-studio/ unless stated otherwise.

- src/pages/Tokens.tsx: replace SubPanel/ViewSwitcher composition.
- src/components/SubPanelTabs.tsx: reuse action-button tab styling where appropriate without panel composition.
- src/features/tokens/view/tokenTableModel.ts: existing model and search behavior.
- src/features/tokens/view/tokenPrimitiveAdapters.ts: color, typography, and spacing source adapters.
- src/features/tokens/view/tokenPanelRegistry.ts: type labels/icons and future adapters.
- src/features/tokens/model.ts, overrides.ts, state.ts, cascadeExport.ts: identities, persistence, effective resolution, and consistent color output.
- src/features/typography/ and src/features/spacing/: existing generators and typed values; no parallel generation path.
- src/features/modes/selection.ts and previewState.ts: canonical saved mode scope and temporary previews.
- src/features/edit-session/state.ts: snapshot and rollback integration.
- src/features/changelog/state.ts and changes.ts: change sources, baselines, impact counts, and revert.
- src/views/tokens/: proposed collection views and colocated styles/stories.
- src/panels/tokens/: proposed details/bulk editing surfaces and stories; preserve old components wherever still consumed.

## Verification gates

1. Extend tests/tokens.ts: search parity, stable IDs, hierarchy/grouping, override migration, mode isolation, validation, and bulk atomicity. Run pnpm test:tokens.
2. Extend tests/changelog.ts and affected mode/domain tests: Save/Cancel/revert, metadata tracking, concept denominators, generated/manual classification, mode deletion, and temporary preview isolation. Run pnpm test:mode-integrity, pnpm test:spacing, and directly affected checks.
3. Extend tests/e2e/tokens.spec.ts: both views, all filters, read-only versus edit mode, checkbox/action separation, selection clearing, details/bulk dialogs, deprecation cancel/confirm, reload persistence, and mode changes. Collect pageerror events and assert none on every browser path.
4. Run dependency-upgrade regressions, pnpm lint, pnpm build, and approved Storybook build/interaction checks. Inspect desktop/mobile and light/dark themes. If shared color resolution changes, smoke-test Foundations -> Colors -> Scale Editor -> Evaluation and affected comparison/output controls; compilation does not replace browser validation.

## Approved roadmap notes

- Classification editing depends on taxonomy creation/editing (INIT-3), generated token-name previews, and future design-data integration (INIT-7); defer classification controls until these exist.
- Grid grouping now follows ordered taxonomy projections. This presentation refinement changes heading text, not the taxonomy contract or broader design-data alignment.
- This enhancement removes Tokens preview/code navigation from this page. EPIC-8.3 remains deferred; semantic-token work is not complete merely because the browser is implemented.

## Implementation record

- Plan saved before implementation. Dependency availability is the first implementation gate.
- Preserve unrelated worktree changes. No commits or changes to the react-spectrum workspace are authorized.

## Tokens page presentation refinement

The main Tokens page now applies a compact presentation to the shared ordered
classification tree. Single-child chains merge into one readable label, each
terminal classification row carries the token itself, and nested token labels
show only terms not already expressed by their parent. A token that is also a
parent keeps its own value and actions on that shared row. Root token rows have
no extra hierarchy indentation. Search rebuilds the hierarchy from matching
tokens without discarding normal expansion state.

List labels and Grid headings omit category prefixes. Grid card names and
grouping are unchanged. Unresolved-classification and compatibility-alias
sections remain explicit. Foundation panels and legacy token panel tables are
not part of this refinement.

Parent checkboxes select matching eligible tokens, including collapsed
descendants and the parent's own token where applicable. Mixed selection selects
the remaining eligible children; a checked parent clears its group. Generated
semantic tokens and compatibility aliases remain excluded. Counts and page state
contain distinct real token IDs, never synthetic group keys. One controlled S2
checkbox column supplies the per-row mixed states while TableView retains native
hierarchy, focus, and selection. The automatic checkbox column is not duplicated.
The installed S2 table forwards React Aria's public `selectionBehavior` setting
but omits it from its TypeScript interface. A small typed compatibility adapter
passes `toggle` through, preventing focus alone from selecting a group before a
checkbox toggles. Keyboard coverage protects this dependency on S2's forwarding
behavior. Column keys are namespaced separately from token IDs.

Canonical classifications, exported paths/names/values, saved baselines, change
logs, generated/manual classification and scoped concept/mode-value denominators
are unchanged. This is local presentation work linked to `LTAX-002`, owned by
`leonardo`, direction `app-to-reference`, profile `reference-checkout`, revision
`838a6835b746f9d77b2697374408901f334d854e`. It does not record manual architecture
acceptance, reference-policy alignment or RFC acceptance.

Verification at completion of the presentation refinement:

| Evidence/check | Verified scope |
| --- | --- |
| `tests/token-table-presentation.ts`, included by `pnpm test:tokens` | Compact chains, unique token endpoints, token-bearing parents, unchanged inputs, filtering, read-only eligibility, overlapping groups and distinct token counts, term-only Grid headings |
| `tests/e2e/tokens.spec.ts`, five focused paths | Desktop/narrow singleton alignment; mixed and collapsed-child selection; focus and repeated keyboard toggles; filtered Select all; details/bulk editing; List/Grid continuity; native range selection |
| `tests/e2e/taxonomy-aliases.spec.ts`, three affected paths | Desktop/narrow alias exclusion and inspection; canonical-name/export identity; saved category order with compact relative labels |
| `tests/e2e/tshirt-generation.spec.ts`, saved-semantic inspection path | Generated read-only inspection and unchanged export/cache/source-directed Cancel |
| `tests/e2e/storybook-token-browser.spec.ts`, eleven checks | Seven interaction stories and four desktop/narrow, light/dark root-alignment checks |
| `pnpm lint`, `pnpm build`, `pnpm storybook:build` | Type checking, lint and both builds |

All nine scoped application paths and eleven static Storybook checks passed,
with empty `pageerror` lists. Application interactions ran on the development
server; the production preview requires Adobe sign-in and was not verified.
The broader `pnpm test:taxonomy` and `pnpm test:taxonomy-order` checks still fail
on unrelated missing default categories, including `contrastLabel`. Those
fixtures/default owners were not repaired by this refinement.

This evidence supports local presentation behavior only. It does not close
`LTAX-002` manual criteria, change the reference pin or record RFC acceptance.
Suggested roadmap note, not applied: record the EPIC-4.4 Tokens-page presentation
slice as implemented, without marking the broader epic complete.

### Export controls restoration

The Tokens page preserves both export buttons above the collection in List and
Grid views. Optional callbacks control their visibility; the generated export
remains disabled until its existing availability guard allows it. Generation
repair errors and export/cache errors remain visible even without export
callbacks. Accessible button names and download filenames are unchanged.
`Tokens.tsx` continues to own complete export data, downloads and error state;
the view does not export the filtered collection or change generation, export
formats, saved baselines or impact accounting.

Focused stories cover both callbacks in both views, unavailable generated
export, missing callbacks and both error alerts. All fourteen static token-browser
checks and both retained T-shirt generated-download workflows passed with empty
`pageerror` lists. Targeted view/story ESLint, `pnpm test:tokens`, `pnpm build`
and `pnpm storybook:build` also passed.

The current full `pnpm lint` run is blocked by an unrelated missing required
`label` prop in `src/panels/color-system/data-vis/DataVisPanel.tsx`. That surface
was not changed for this restoration. The historical verification above does
not imply the current shared checkout passes full lint. This follow-up leaves
the `LTAX-002` reference pin, alignment disposition, manual criteria, RFC state
and roadmap status unchanged.

### Mode and adaptive display controls

The Tokens header reuses `PreviewToolbar` in an inline, end-aligned placement.
It contains the same mode selectors, responsive Modes picker and adaptive
controls as Preview, without the floating panel treatment. Narrow layouts
compact the controls using the existing toolbar measurement behavior.

Tokens and Preview share mode selection and temporary adaptive settings.
Changing either updates displayed token values through the existing
`browserTokensAtom` generators, in List and Grid; there is no second generation
path or independently saved Tokens configuration. Reset restores the selected
mode values. Adaptive settings remain temporary and disappear on reload.
Existing edit guards still require a saved mode before token value editing.
Saved baselines, change-log sources, generated/manual classification and impact
denominators are unchanged. No editable domain is added.

This is a forward-compatible presentation slice of EPIC-2.2 and EPIC-4.4, not
completion of either broader feature. `tests/token-preview-controls.ts` checks
mode and adaptive value updates, reset and saved-baseline isolation.
`tests/e2e/token-preview-controls.spec.ts` covers desktop/narrow header alignment,
table value updates, reset, keyboard focus restoration, Grid availability and
shared settings with the existing floating Preview toolbar, with empty
`pageerror` assertions. Run the focused state check with
`pnpm exec tsx tests/token-preview-controls.ts`.

The focused state check, both browser paths, full lint/type checking and the
production build passed. Broader checks remain blocked by existing fixtures:
`pnpm test:tokens` attempts to remove a token referenced by a component, and
`pnpm test:mode-ui` expects eight change groups where the current defaults
produce nine. These domain fixtures were not changed for the header controls.