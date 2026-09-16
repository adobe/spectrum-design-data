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
 * RSP/SWC per-section content merge logic, for bead
 * spectrum-design-data-085.2.2's Phase B.
 *
 * ## Why this exists
 *
 * Phase A (`component-map.js`) established that all 18 Hub SWC component pages
 * are a strict subset of RSP's 61 at the page-existence level, so the bead's
 * originally-stated default — "prefer the more-complete platform page" — can
 * never be decided by page/heading presence alone. This module implements the
 * actual rule: per-section text comparison, RSP as the default base (the only
 * platform that is ever a strict superset), with any genuine content
 * divergence or SWC-only addition surfaced as a flag for human review rather
 * than silently resolved — mirroring `hub-guideline-sync.yml`'s existing
 * "guard-and-surface, don't guess" posture toward ambiguity.
 *
 * ## What live data actually showed (re-verified for this phase, 18/18 shared
 * RSP/SWC component pairs, full section-by-section text comparison)
 *
 * An earlier investigation (recorded during Phase A's planning) claimed
 * `button`'s `usage-guidelines` fragment diverged in wording between RSP and
 * SWC. Re-verified live for this phase with a full post-fragment-inlining
 * text diff: that claim does **not** hold today — `button` is byte-identical
 * between RSP and SWC across every shared section. Whether the Hub content
 * changed since the original check or the original check was methodologically
 * incomplete (e.g. compared before fragments were fully inlined) is moot; this
 * module's design was validated against a fresh live re-check, not the stale
 * claim. Concretely, live data (18/18 shared pairs) showed:
 * - 17 of 18 pairs: every shared-heading section is byte-identical.
 * - The one genuine divergence found, anywhere, was inside `link`'s
 *   `Component options` section — RSP describes React-style props
 *   (`staticColor`, …), SWC describes CSS class names (`swc-Link--standalone`,
 *   …). This is exactly the platform-specific-by-design case the bead calls
 *   out: comparing them isn't detecting a content mismatch, it's comparing two
 *   different APIs. `Component options` is already excluded from diffing
 *   below (see `NON_DIFFABLE_HEADINGS`).
 * - `link`'s SWC page also has a whole `Behaviors` section (4 subsections:
 *   "Single vs. multiple expansion", "Title wrapping", "Optional actions", …)
 *   that RSP's `link` page does not have at all. This is the one real,
 *   live-observed case of the "swc-only-section" flag below actually firing —
 *   genuine SWC content that would be silently lost if this module only ever
 *   looked at RSP.
 * - `progress-bar`, `status-light`, and `tabs` have several RSP-only headings
 *   SWC's (thinner) page lacks — expected and unremarkable, since RSP already
 *   being the fuller platform is exactly Phase A's premise. No flag: there is
 *   nothing for a human to decide when only one platform has an opinion.
 *
 * ## What this module deliberately does not do
 *
 * - It does not fetch anything — see `component-fetch.js` for that. This
 *   keeps the actual diff logic (the part worth reviewing/testing carefully)
 *   pure and network-free.
 * - It does not decide how the fan-out case (`color-handle-and-loupe`, see
 *   `component-map.js`) routes to two local targets — that's an orthogonal
 *   concern. Run this module once per Hub slug; a future caller applies the
 *   same merged output to every target `resolveComponentTargets()` returns for
 *   that slug. (Live-checked for this phase: `color-handle-and-loupe`'s SWC
 *   page is byte-identical to its RSP page across all 12 sections, so this
 *   case produces zero flags today — worth re-confirming if the Hub content
 *   changes.)
 * - It does not decide *where* the merged sections get written, or wire into
 *   any workflow — that's Phase C (`hub-component-sync.yml`).
 */

/**
 * Section headings excluded from RSP/SWC diffing entirely, because their
 * content either never becomes part of `documentBlocks` output (it's already
 * dropped by `s2-docs-to-document-blocks/src/blocks-builder.js`'s
 * `SKIP_SECTIONS`) or is platform-specific by design (`Component options`
 * describes a different underlying API per platform, so RSP vs SWC text there
 * is *expected* to differ and is not a signal of anything worth flagging).
 *
 * Deliberately duplicated rather than imported: `spectrum-hub-fetcher` and
 * `s2-docs-to-document-blocks` are independent packages with no existing
 * runtime dependency between them, and this list is small enough that
 * duplicating it is cheaper than adding cross-package coupling for one array.
 * `test/component-merge.test.js` imports the real `SKIP_SECTIONS` export from
 * `blocks-builder.js` at test time (not runtime) specifically to assert this
 * list stays in sync — keep both lists in lockstep if blocks-builder's ever
 * changes.
 */
export const NON_DIFFABLE_HEADINGS = new Set([
  "resources",
  "anatomy",
  "component options",
  "states",
  "design tokens",
  "changelog",
  "questions or feedback?",
  "related components",
]);

/**
 * Collapse superficial scrape/formatting noise (case, smart quotes, dashes,
 * punctuation, whitespace) before comparing RSP vs SWC text, so trivial
 * rendering differences never register as a content divergence. Mirrors
 * `s2-docs-to-document-blocks/src/blocks-builder.js`'s `normalizeForDedup`
 * intent, minus the markdown-link-syntax stripping step: at this stage
 * (`sections.js`'s pre-markdown, tag-stripped plain text) there is no
 * markdown link syntax yet to strip.
 */
function normalizeForCompare(text) {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f]/g, '"')
    .replace(/[\u2013\u2014]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function headingKey(section) {
  return section.heading.trim().toLowerCase();
}

/**
 * Merge an RSP component page's sections with its SWC counterpart.
 *
 * Behavior per shared heading (case-insensitive match on heading text only,
 * not heading level — real-world RSP/SWC pages have shown identical headings
 * at matching levels, but matching on text alone is more robust to any future
 * templating drift between the two platforms' fragment sets):
 * - Listed in `NON_DIFFABLE_HEADINGS`: RSP's version is kept, never compared.
 * - RSP has it, SWC doesn't (including when `swcSections` is `[]` because the
 *   Hub has no SWC page at all): RSP's version is kept, no flag — there is
 *   nothing to reconcile when only one platform has an opinion.
 * - Both have it, text matches after `normalizeForCompare`: RSP's version is
 *   kept, no flag.
 * - Both have it, text genuinely differs: RSP's version is kept (the default
 *   base), AND a `"diverged"` flag carrying both texts is emitted so a human
 *   can override it in review — this module never silently guesses.
 * - SWC has it, RSP doesn't, and it isn't in `NON_DIFFABLE_HEADINGS`: nothing
 *   is merged into `sections` (RSP-shaped output has no slot for it), but a
 *   `"swc-only-section"` flag is emitted so the content isn't silently
 *   dropped — a human can decide whether it belongs in the merged page.
 *
 * @param {Array<{heading:string, level:number, anchor:string, text:string}>} rspSections
 * @param {Array<{heading:string, level:number, anchor:string, text:string}>} swcSections
 *   Pass `[]` when the Hub has no SWC page for this slug at all — behaves
 *   identically to every RSP heading having no SWC counterpart.
 * @returns {{
 *   sections: Array<{heading:string, level:number, anchor:string, text:string}>,
 *   flags: Array<{type: "diverged"|"swc-only-section", heading: string, level: number, rspText?: string, swcText?: string}>,
 * }}
 */
export function mergeComponentSections(rspSections, swcSections) {
  const swcByHeading = new Map(swcSections.map((s) => [headingKey(s), s]));
  const rspHeadings = new Set(rspSections.map(headingKey));
  const flags = [];

  const sections = rspSections.map((rspSection) => {
    const key = headingKey(rspSection);

    if (NON_DIFFABLE_HEADINGS.has(key)) {
      return rspSection;
    }

    const swcSection = swcByHeading.get(key);
    if (!swcSection) {
      return rspSection;
    }

    if (
      normalizeForCompare(rspSection.text) ===
      normalizeForCompare(swcSection.text)
    ) {
      return rspSection;
    }

    flags.push({
      type: "diverged",
      heading: rspSection.heading,
      level: rspSection.level,
      rspText: rspSection.text,
      swcText: swcSection.text,
    });
    return rspSection;
  });

  for (const swcSection of swcSections) {
    const key = headingKey(swcSection);
    if (rspHeadings.has(key) || NON_DIFFABLE_HEADINGS.has(key)) {
      continue;
    }
    flags.push({
      type: "swc-only-section",
      heading: swcSection.heading,
      level: swcSection.level,
      swcText: swcSection.text,
    });
  }

  return { sections, flags };
}
