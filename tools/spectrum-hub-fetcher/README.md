# [**@adobe/spectrum-hub-fetcher**](https://github.com/adobe/spectrum-hub-fetcher) — component mapping (spectrum-design-data-085.2.2)

This document is the reviewer-facing summary for `src/component-map.js`: the
hub-component-page → local `packages/design-data/components/*.json` reconciliation
table for spectrum-design-data-085.2.2. It exists so the mapping decisions below can
be reviewed and approved on their own, before any pipeline code (Phase B's RSP/SWC
merge logic, Phase C's `hub-component-sync.yml`) is built on top of them.

Full rationale and the exact tables live as JSDoc in `src/component-map.js` itself —
this file is a condensed index of the decisions that need a human "yes, that's right"
before Phase B/C proceed.

## What was cross-referenced

* Live, unbounded (no `--limit`) dry-run fetches of `/web/rsp/components/*` (61
  pages) and `/web/swc/components/*` (18 pages) via `spectrum-hub-fetcher`'s CLI.
* All 97 files in `packages/design-data/components/`.

## Decisions requiring review

1. **60 exact 1:1 matches** (`COMPONENT_SLUG_MAP`) — hub slug equals an existing
   local filename exactly. Low risk, mechanical.

2. **1 curated fan-out** (`COMPONENT_SLUG_FANOUT`): the Hub's single
   `color-handle-and-loupe` page must route into *two* local components,
   `color-handle.json` and `color-loupe.json`. The Hub page's prose is genuinely
   fused across both concepts (not per-component sectioned), so the decision is to
   duplicate the same combined content into both targets and flag it for human
   review in the generated PR, rather than inventing an automatic text split.
   **This is the one decision most worth a second pair of eyes** — please confirm
   duplication (vs. e.g. picking one target, or waiting for the Hub to split the
   page itself) is the right call.

3. **35 local-only components** (`COMPONENTS_WITHOUT_HUB_PAGE`) with no Hub page
   yet — informational only, unaffected by this pipeline until the Hub publishes
   something. Two names in this bucket are easy to mistake for fan-out targets of
   an *existing* mapped slug but are not: `cards` (hub, 1:1) vs. `card` /
   `card-horizontal` / `collection-card` (local-only, unrelated); `calendar` (hub,
   1:1) vs. `single-calendar` / `double-calendar` / `triple-calendar` (local-only,
   unrelated). An earlier manual spot-check in this investigation briefly
   mis-flagged these as splits; the automated cross-reference in
   `test/component-map.test.js` corrected that.

## What this table deliberately does not do

* No RSP-vs-SWC merge logic — see the "Phase B" section below.
* No wiring into any fetch/stage/transform/workflow code. Nothing currently calls
  `resolveComponentTargets()` outside of its own tests.
* No category-prefix mapping (unlike `hub-map.js`'s guideline-side
  `PREFIX_CATEGORIES`) — component hub paths are flat, so each target's category is
  taken from the existing local component's own `meta.category`, purely for a
  future staging step's convenience.

## Verification

`test/component-map.test.js` asserts: no duplicate/overlapping slugs across the
three tables, every mapped/fan-out/no-hub-page slug corresponds to a real file
under `packages/design-data/components/`, and — the strongest invariant — the union
of all three tables exactly accounts for all 97 local component files with none
left unaccounted for.

***

# Phase B: RSP/SWC per-section content merge (`component-fetch.js` / `component-merge.js`)

Phase A established the reconciliation table above. Phase B implements the actual
RSP/SWC merge rule: `component-fetch.js` fetches a Hub slug's RSP and SWC pages
(SWC absence is a normal, expected outcome, never an error), and
`component-merge.js` (pure, network-free, the part most worth reviewing carefully)
diffs them per section.

## The rule

All 18 Hub SWC component pages are a strict subset of RSP's 61 at the
page-existence level (Phase A), so the bead's originally-stated default —
"prefer the more-complete platform page" — can never be decided by page/heading
presence alone. The actual rule, implemented in `mergeComponentSections()`:

* **Shared heading, identical text** (after normalizing away scrape noise like
  smart quotes/case): RSP's version is kept, no flag.
* **Shared heading, genuinely divergent text**: RSP's version is kept as the
  default base, but a `"diverged"` flag carries both texts for human review — this
  is never silently resolved.
* **RSP-only heading** (including when the Hub has no SWC page at all): RSP's
  version is kept, no flag — nothing to reconcile when only one platform has an
  opinion.
* **SWC-only heading**: not merged into the output (there's no RSP slot for it),
  but flagged as `"swc-only-section"` so real SWC-only content is never silently
  dropped.
* **`Component options`, `Anatomy`, `States`, and the other headings in
  `NON_DIFFABLE_HEADINGS`**: never diffed at all. These either never reach
  `documentBlocks` output (already skipped by
  `s2-docs-to-document-blocks/src/blocks-builder.js`'s `SKIP_SECTIONS` — the two
  lists are asserted to stay in sync by a test) or are platform-specific by
  design (`Component options` describes a different API per platform: RSP props
  vs. SWC CSS classes — comparing them isn't detecting a mismatch, it's comparing
  two different things).

## What live data actually showed

Re-verified live for this phase across all 18 shared RSP/SWC pairs, with a full
post-fragment-inlining section-by-section text diff (not the page/heading-presence
check Phase A limited itself to):

* **17 of 18 pairs are byte-identical** across every shared heading.
* The one real divergence found anywhere was `link`'s `Component options` section
  (RSP props vs. SWC CSS classes) — already excluded from diffing by design, so it
  produces no flag.
* `link`'s SWC page also has an entire `Behaviors` section (with subsections) that
  RSP's `link` page lacks — the one live case where the `"swc-only-section"` flag
  actually fires.
* `progress-bar`, `status-light`, and `tabs` have several RSP-only headings SWC's
  thinner page lacks — expected, unremarkable, no flag.
* `color-handle-and-loupe` (Phase A's fan-out case) is byte-identical between RSP
  and SWC across all 12 sections — zero flags today.

**Correction to an earlier claim**: Phase A's planning notes (and this file's
earlier revision) stated `button`'s `usage-guidelines` fragment diverges in
wording between RSP and SWC. Re-verified live for this phase with a full
post-fragment-inlining diff, that does **not** hold today — `button` is
byte-identical between the two platforms across every shared section. Whether Hub
content changed since the original check or that check was methodologically
incomplete is moot; this module's design was validated against a fresh live
re-check, not the stale claim.

## Verification

`test/component-fetch.test.js` and `test/component-merge.test.js` (15 tests):
identical/divergent/RSP-only/SWC-only section handling, case-insensitive heading
matching, scrape-noise-tolerant comparison, `NON_DIFFABLE_HEADINGS` exclusion for
every listed heading, a realistic multi-section page mixing all four outcomes, and
a drift guard asserting `NON_DIFFABLE_HEADINGS` stays equal to
`blocks-builder.js`'s real `SKIP_SECTIONS` export.

## What Phase B deliberately does not do

* No wiring into any workflow. Nothing currently calls `fetchComponentPair()` or
  `mergeComponentSections()` outside of their own tests — that's Phase C
  (`hub-component-sync.yml`, a new, separate workflow — not a rename or extension
  of `hub-guideline-sync.yml`).
* No decision about *where* the merged/flagged output is written, or how flags
  surface in a generated PR — that's also Phase C's job.
* No change to `hub-guideline-sync.yml`, `cli.js`'s existing guideline fetch path,
  or any other part of the already-shipped, live-verified guideline sync. The new
  component-fetch logic is a fully standalone module reusing only the lower-level
  building blocks (`inlineFragments`, `stripNoise`, `splitSections`).
