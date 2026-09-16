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

import { parse } from "node-html-parser";

import { inlineFragments } from "./fragments.js";
import { isStubSections, splitSections, stripNoise } from "./sections.js";

/**
 * Fetch/section-split for Hub component pages, for bead
 * spectrum-design-data-085.2.2's Phase B (RSP/SWC per-section merge).
 *
 * This is deliberately a standalone module, not a refactor of `cli.js`'s
 * existing `fetchPageSections`: `cli.js` drives the already-shipped,
 * live-verified guideline-only sync path (bead spectrum-design-data-085.2.3),
 * and reusing/modifying its internals here would risk destabilizing that
 * pipeline for a feature it was never meant to serve. The two fetch paths
 * intentionally share only their lower-level building blocks
 * (`inlineFragments`, `stripNoise`, `splitSections`), not a common
 * orchestration function.
 */

export const RSP_COMPONENT_PREFIX = "/web/rsp/components";
export const SWC_COMPONENT_PREFIX = "/web/swc/components";

/**
 * Fetch and section-split a single platform's component page for `slug`.
 *
 * A missing page (the Hub returns no content for this path — e.g. SWC simply
 * hasn't published this component) is a normal, expected outcome, not an
 * error: `exists` is `false` and every other field is an empty/neutral
 * default. Callers should treat `exists: false` as "nothing to merge from
 * this platform", never as a fetch failure to retry or report.
 *
 * @param {{ fetchPage: (path: string) => Promise<{html:string}|null> }} client
 * @param {string} prefix - `RSP_COMPONENT_PREFIX` or `SWC_COMPONENT_PREFIX`
 * @param {string} slug
 * @param {{ warn?: (message: string) => void }} [options]
 * @returns {Promise<{
 *   path: string,
 *   exists: boolean,
 *   sections: Array<{heading:string, level:number, anchor:string, text:string}>,
 *   isStub: boolean,
 *   fragments: {resolved:number, missing:number, unavailable:number, failed:number}|null,
 *   title: string,
 * }>}
 */
export async function fetchComponentPage(
  client,
  prefix,
  slug,
  { warn = () => {} } = {},
) {
  const path = `${prefix}/${slug}`;
  const page = await client.fetchPage(path);

  if (!page?.html) {
    return {
      path,
      exists: false,
      sections: [],
      isStub: true,
      fragments: null,
      title: "",
    };
  }

  const root = parse(page.html);
  const fragments = await inlineFragments(root, client.fetchPage, { warn });
  stripNoise(root);

  const sections = splitSections(root);
  const title = root.querySelector("h1")?.text.trim() || slug;

  return {
    path,
    exists: true,
    sections,
    isStub: isStubSections(sections),
    fragments,
    title,
  };
}

/**
 * Fetch both the RSP and SWC component pages for a Hub slug. SWC absence
 * (the far more common case — per Phase A's live findings, SWC only publishes
 * 18 of RSP's 61 component pages) is not an error and requires no special
 * handling by the caller: `swc.exists` is simply `false`, and
 * `mergeComponentSections` (see `component-merge.js`) treats an empty SWC
 * section list exactly the same as "no SWC page at all" — RSP content is used
 * with no divergence flags, since there is nothing to compare against.
 *
 * @param {{ fetchPage: (path: string) => Promise<{html:string}|null> }} client
 * @param {string} slug
 * @param {{ warn?: (message: string) => void }} [options]
 * @returns {Promise<{ slug: string, rsp: object, swc: object }>}
 */
export async function fetchComponentPair(client, slug, options = {}) {
  const [rsp, swc] = await Promise.all([
    fetchComponentPage(client, RSP_COMPONENT_PREFIX, slug, options),
    fetchComponentPage(client, SWC_COMPONENT_PREFIX, slug, options),
  ]);

  return { slug, rsp, swc };
}
