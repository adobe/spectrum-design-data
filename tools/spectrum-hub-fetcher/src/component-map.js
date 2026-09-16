/**
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/**
 * Hub component page -> local `packages/design-data/components/*.json` reconciliation
 * table, for bead spectrum-design-data-085.2.2.
 *
 * This is a **data-only** module: it records the curated decisions made while
 * cross-referencing the live Hub against today's 97 local component files. It does
 * not fetch, stage, or transform anything, and nothing in the pipeline consults it
 * yet — that wiring is deliberately deferred to spectrum-design-data-085.2.2's Phase
 * B/C (RSP/SWC per-section merge, `hub-component-sync.yml`). Landing the table on
 * its own first means the mapping decisions can be reviewed independently of any
 * pipeline code.
 *
 * ---
 *
 * ## How this table was built
 *
 * The Hub currently only publishes RSP (`/web/rsp/components/*`) and SWC
 * (`/web/swc/components/*`) component pages; unlike guideline pages there is no
 * path-prefix -> category signal (`hub-map.js`'s `PREFIX_CATEGORIES` has no
 * component equivalent), because component paths are flat. Category is instead
 * carried over from the *existing* local component's own `meta.category` field, so
 * a future stage-docs step can route a fetched page into the same
 * `docs/s2-docs/components/<category>/` layout `s2-docs-to-document-blocks`
 * already expects.
 *
 * As of this writing, live fetches (dry-run, unbounded `--limit`) found:
 * - RSP: 61 pages. SWC: 18 pages, and all 18 SWC slugs are a strict subset of
 *   RSP's 61 — SWC never has a page RSP lacks. This means "prefer the
 *   more-complete platform page" (spectrum-design-data-085.2.2's stated default)
 *   can never be decided by page/heading presence alone: real per-section content
 *   divergence exists even where both platforms have the same page (e.g. `button`'s
 *   `usage-guidelines` fragment differs in wording between RSP and SWC, while
 *   `accordion`'s is byte-identical). The actual RSP/SWC merge rule is per-section
 *   text diffing and is Phase B's job, not this table's — this table only maps
 *   *which* local file(s) a given hub slug (regardless of platform) targets.
 * - Local: 97 component JSON files.
 * - 60 RSP slugs match an existing local filename exactly (`COMPONENT_SLUG_MAP`).
 * - 1 RSP slug needs curated fan-out (`COMPONENT_SLUG_FANOUT`): the Hub only
 *   publishes a single combined `color-handle-and-loupe` page, but the local data
 *   models `color-handle` and `color-loupe` as two separate components. The Hub
 *   page's prose is genuinely fused (not per-component sectioned — see its
 *   `option-details`/`states`/`behaviors`/`usage-guidelines` fragments), so there is
 *   no clean text split; the curated decision is to route the *same* combined
 *   content into both targets and flag it for human review in the PR, rather than
 *   inventing a heuristic split. (This mirrors how `hub-map.js` handles cases the
 *   generic rules can't settle: a small, justified, explicit override.)
 * - 35 local components have no corresponding Hub page at all yet
 *   (`COMPONENTS_WITHOUT_HUB_PAGE`) and stay on their existing frozen source until
 *   the Hub publishes one. Two names in this bucket deserve a callout because they
 *   are easy to mistake for 1:many splits of an *existing* mapped slug, but are
 *   not: the Hub's `cards` page maps 1:1 to local `cards.json` (the umbrella
 *   component), while `card`, `card-horizontal`, and `collection-card` are
 *   distinct local components with no Hub page of their own — not fragments of
 *   `cards` needing fan-out. The same pattern holds for `calendar` (1:1 hub match)
 *   versus `single-calendar` / `double-calendar` / `triple-calendar` (local-only,
 *   no fan-out).
 *
 * Re-run the cross-reference if either side's file listing changes materially —
 * this table is a snapshot, not derived at build time.
 */

/**
 * Hub slugs that map 1:1 onto an existing `packages/design-data/components/<slug>.json`
 * of the same name, grouped by that file's `meta.category` (purely for readability
 * and future staging use; the mapping itself doesn't depend on category grouping).
 */
export const COMPONENT_SLUG_MAP = {
  actions: [
    "action-bar",
    "action-button",
    "action-group",
    "avatar-group",
    "button",
    "button-group",
    "close-button",
    "link",
    "menu",
  ],
  containers: ["cards", "divider", "popover"],
  "data-visualization": ["table"],
  feedback: [
    "alert-dialog",
    "contextual-help",
    "illustrated-message",
    "in-line-alert",
    "standard-dialog",
    "takeover-dialog",
    "toast",
    "tooltip",
  ],
  inputs: [
    "accordion",
    "calendar",
    "checkbox",
    "checkbox-group",
    "color-area",
    "color-slider",
    "color-wheel",
    "combo-box",
    "date-picker",
    "drop-zone",
    "field-label",
    "help-text",
    "number-field",
    "picker",
    "radio-button",
    "radio-group",
    "search-field",
    "select-box",
    "slider",
    "swatch",
    "swatch-group",
    "switch",
    "tag-group",
    "text-area",
    "text-field",
  ],
  navigation: [
    "avatar",
    "breadcrumbs",
    "list-view",
    "segmented-control",
    "side-navigation",
    "tabs",
    "tag",
    "thumbnail",
    "tree-view",
  ],
  status: ["badge", "meter", "progress-bar", "progress-circle", "status-light"],
};

/**
 * Curated 1:many overrides: a single Hub page whose content must be routed into
 * more than one local component file. Keep this table small and justified — see
 * the module doc above for why `color-handle-and-loupe` is here.
 */
export const COMPONENT_SLUG_FANOUT = {
  "color-handle-and-loupe": ["color-handle", "color-loupe"],
};

/**
 * Local components with no corresponding Hub page yet. Informational only: the
 * fetcher will never encounter these slugs (the Hub doesn't publish them), so
 * nothing currently reads this list at runtime. It exists so the "why isn't X
 * covered" question has a documented, single-sourced answer, and so a future
 * cross-reference re-run has something to diff against.
 */
export const COMPONENTS_WITHOUT_HUB_PAGE = [
  "alert-banner",
  "bar-panel",
  "body",
  "bottom-navigation-android",
  "card",
  "card-horizontal",
  "coach-indicator",
  "coach-mark",
  "code",
  "collection-card",
  "color-control",
  "date-field",
  "detail",
  "double-calendar",
  "field",
  "floating-action-button",
  "form-item",
  "heading",
  "in-field-button",
  "in-field-progress-button",
  "in-field-progress-circle",
  "opacity-checkerboard",
  "rating",
  "scroll-zoom-bar",
  "segmented-text-field",
  "single-calendar",
  "stack-item",
  "standard-panel",
  "steplist",
  "tag-field",
  "time-field",
  "title",
  "tray",
  "triple-calendar",
  "user-card",
];

/**
 * Resolve a Hub component slug to the local component filename(s) (without
 * extension) it should be staged into. Returns an empty array for a slug this
 * table doesn't recognize — callers should treat that as "flag for review", not
 * silently drop the page, since it likely means the Hub published something new
 * and this table needs a curated decision, not a guess.
 *
 * @param {string} hubSlug
 * @returns {string[]}
 */
export function resolveComponentTargets(hubSlug) {
  if (hubSlug in COMPONENT_SLUG_FANOUT) {
    return COMPONENT_SLUG_FANOUT[hubSlug];
  }
  for (const slugs of Object.values(COMPONENT_SLUG_MAP)) {
    if (slugs.includes(hubSlug)) {
      return [hubSlug];
    }
  }
  return [];
}
