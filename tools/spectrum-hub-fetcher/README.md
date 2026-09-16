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

* No RSP-vs-SWC merge logic. All 18 SWC slugs are a strict subset of RSP's 61, so
  "prefer the more-complete platform page" cannot be decided by page/heading
  presence — real per-section content divergence exists even where both platforms
  publish the same page (e.g. `button`'s `usage-guidelines` fragment differs in
  wording; `accordion`'s is identical). That merge rule is Phase B's job.
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
