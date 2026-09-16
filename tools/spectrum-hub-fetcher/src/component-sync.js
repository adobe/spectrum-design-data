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
 * Pure fetch+merge+render orchestration for a single Hub component slug, for
 * bead spectrum-design-data-085.2.5's `hub-component-sync.yml` (Phase C).
 *
 * Deliberately has no CLI/argv/process.exit concerns — see
 * `component-sync-cli.js` for the thin entrypoint that drives this module
 * across every known slug and writes files to disk. Splitting the two keeps
 * this file importable in tests without triggering a real fetch run, the
 * same separation `cli.js` already has from `component-fetch.js` /
 * `component-merge.js`.
 *
 * This module is the fetch-side counterpart to the guideline pipeline's
 * `fetchPageSections()` + `renderPage()` combination in `cli.js`: it drives
 * `component-fetch.js` (fetch RSP/SWC pairs) and `component-merge.js`
 * (per-section diff/merge), then renders the merged section list to
 * Markdown with the *same* `renderPage()` the guideline path uses, so the
 * already-shipped `s2-docs-to-document-blocks/src/cli.js transform` command
 * can consume it completely unchanged — no new heading-to-block-type
 * mapping needed here.
 *
 * Only ever asked about Hub slugs `component-map.js` already knows about
 * (`COMPONENT_SLUG_MAP`'s 60 + `COMPONENT_SLUG_FANOUT`'s 1 = 61 slugs,
 * matching Phase A's live RSP page count exactly) — it does not attempt to
 * discover brand-new Hub component pages the reconciliation table doesn't
 * yet list; that is future reconciliation-table maintenance, not this
 * pipeline's job. If a known slug's RSP page has gone missing since Phase
 * A's snapshot, `syncSlug` reports `status: "unavailable"` rather than
 * silently skipping it.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fetchComponentPair } from "./component-fetch.js";
import { mergeComponentSections } from "./component-merge.js";
import {
  COMPONENT_SLUG_FANOUT,
  COMPONENT_SLUG_MAP,
  resolveComponentTargets,
} from "./component-map.js";
import { renderPage } from "./markdown.js";

/** Every Hub slug this pipeline is responsible for, in a stable, deterministic order. */
export function listKnownHubSlugs() {
  const fromMap = Object.values(COMPONENT_SLUG_MAP).flat();
  const fromFanout = Object.keys(COMPONENT_SLUG_FANOUT);
  return [...fromMap, ...fromFanout];
}

/**
 * Local `packages/design-data/components/<slug>.json`'s `meta.category`, used to
 * mirror the same `docs/s2-docs/components/<category>/<slug>.md` layout
 * `s2-docs-to-document-blocks` already reads. Read directly from the existing
 * component JSON rather than from `COMPONENT_SLUG_MAP`'s grouping keys, since
 * fan-out targets (`color-handle`, `color-loupe`) aren't listed there at all —
 * this way every target, mapped or fanned-out, resolves the same way.
 */
export function resolveTargetCategory(componentsDir, targetSlug) {
  const jsonPath = join(componentsDir, `${targetSlug}.json`);
  const parsed = JSON.parse(readFileSync(jsonPath, "utf8"));
  const category = parsed?.meta?.category;
  if (!category) {
    throw new Error(
      `packages/design-data/components/${targetSlug}.json has no meta.category — cannot ` +
        "determine its docs/s2-docs/components/<category>/ staging directory.",
    );
  }
  return category;
}

/**
 * Fetch, merge, and render a single Hub slug into staged Markdown (not yet
 * written to disk — the caller decides where/whether to write).
 *
 * @param {{
 *   client: { fetchPage: (path: string) => Promise<{html:string}|null> },
 *   slug: string,
 *   componentsDir: string,
 * }} args
 * @returns {Promise<{
 *   slug: string,
 *   status: "written"|"unavailable"|"unrecognized",
 *   targets: Array<{target: string, category: string}>,
 *   markdown?: string,
 *   flags: Array,
 *   fragmentsResolved: number,
 *   fragmentsFailed: number,
 * }>}
 */
export async function syncSlug({ client, slug, componentsDir }) {
  const { rsp, swc } = await fetchComponentPair(client, slug);

  if (!rsp.exists) {
    // A slug component-map.js's snapshot expected to exist no longer does — the
    // reconciliation table needs a human re-check, not a silent skip.
    return {
      slug,
      status: "unavailable",
      targets: [],
      flags: [],
      fragmentsResolved: 0,
      fragmentsFailed: 0,
    };
  }

  const { sections, flags } = mergeComponentSections(
    rsp.sections,
    swc.sections,
  );
  const targets = resolveComponentTargets(slug);

  if (targets.length === 0) {
    // Shouldn't happen — every slug this pipeline iterates comes from
    // component-map.js's own tables — but guard against it anyway rather than
    // assume it can't occur.
    return {
      slug,
      status: "unrecognized",
      targets: [],
      flags,
      fragmentsResolved: rsp.fragments?.resolved ?? 0,
      fragmentsFailed: rsp.fragments?.failed ?? 0,
    };
  }

  const markdown = renderPage({
    title: rsp.title,
    sections,
    sourceUrl: rsp.path,
    lastUpdated: null,
    tags: [],
    extra: { hub_path: rsp.path, swc_exists: swc.exists },
  });

  const writtenTargets = targets.map((target) => ({
    target,
    category: resolveTargetCategory(componentsDir, target),
  }));

  return {
    slug,
    status: "written",
    targets: writtenTargets,
    markdown,
    flags,
    fragmentsResolved: rsp.fragments?.resolved ?? 0,
    fragmentsFailed:
      (rsp.fragments?.failed ?? 0) + (swc.fragments?.failed ?? 0),
  };
}
