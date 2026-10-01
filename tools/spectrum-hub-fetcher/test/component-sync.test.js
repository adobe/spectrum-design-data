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

import test from "ava";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  listKnownHubSlugs,
  resolveTargetCategory,
  syncSlug,
} from "../src/component-sync.js";
import {
  COMPONENT_SLUG_FANOUT,
  COMPONENT_SLUG_MAP,
} from "../src/component-map.js";
import {
  RSP_COMPONENT_PREFIX,
  SWC_COMPONENT_PREFIX,
} from "../src/component-fetch.js";

const COMPONENTS_DIR = fileURLToPath(
  new URL("../../../packages/design-data/components/", import.meta.url),
);

const ACCORDION_HTML = readFileSync(
  new URL(
    "./fixtures/web/swc/components/accordion.plain.html",
    import.meta.url,
  ),
  "utf8",
);

function createFakeClient(pages) {
  return {
    async fetchPage(path) {
      const html = pages[path];
      return html ? { html } : null;
    },
  };
}

// ── listKnownHubSlugs ───────────────────────────────────────────────────────

test("listKnownHubSlugs returns every COMPONENT_SLUG_MAP entry plus every COMPONENT_SLUG_FANOUT key", (t) => {
  const slugs = listKnownHubSlugs();
  const mapped = Object.values(COMPONENT_SLUG_MAP).flat();
  const fanout = Object.keys(COMPONENT_SLUG_FANOUT);

  t.is(slugs.length, mapped.length + fanout.length);
  for (const slug of mapped) t.true(slugs.includes(slug));
  for (const slug of fanout) t.true(slugs.includes(slug));
});

// ── resolveTargetCategory ───────────────────────────────────────────────────

test("resolveTargetCategory reads meta.category from the real local component JSON", (t) => {
  t.is(resolveTargetCategory(COMPONENTS_DIR, "accordion"), "inputs");
});

test("resolveTargetCategory resolves fan-out targets (not in COMPONENT_SLUG_MAP) via their own JSON", (t) => {
  t.is(resolveTargetCategory(COMPONENTS_DIR, "color-handle"), "inputs");
  t.is(resolveTargetCategory(COMPONENTS_DIR, "color-loupe"), "feedback");
});

test("resolveTargetCategory throws for a slug with no local JSON file", (t) => {
  t.throws(() => resolveTargetCategory(COMPONENTS_DIR, "not-a-real-component"));
});

// ── syncSlug ─────────────────────────────────────────────────────────────────

test("syncSlug returns status:written with resolved targets/categories when the RSP page exists", async (t) => {
  const client = createFakeClient({
    [`${RSP_COMPONENT_PREFIX}/accordion`]: ACCORDION_HTML,
    [`${SWC_COMPONENT_PREFIX}/accordion`]: ACCORDION_HTML,
  });

  const result = await syncSlug({
    client,
    slug: "accordion",
    componentsDir: COMPONENTS_DIR,
  });

  t.is(result.status, "written");
  t.deepEqual(result.targets, [{ target: "accordion", category: "inputs" }]);
  t.true(result.markdown.startsWith("---\n"));
  t.true(result.markdown.includes("# "));
  t.deepEqual(result.flags, []); // identical RSP/SWC content => no flags
});

test("syncSlug fans a single Hub page out to both color-handle and color-loupe targets", async (t) => {
  const client = createFakeClient({
    [`${RSP_COMPONENT_PREFIX}/color-handle-and-loupe`]: ACCORDION_HTML,
    // No SWC page — matches Phase A/B's live finding that this slug is RSP-only... actually it
    // does have an SWC page live, but this test only needs to prove the fan-out write logic,
    // independent of that fact.
  });

  const result = await syncSlug({
    client,
    slug: "color-handle-and-loupe",
    componentsDir: COMPONENTS_DIR,
  });

  t.is(result.status, "written");
  t.deepEqual(result.targets.map((entry) => entry.target).sort(), [
    "color-handle",
    "color-loupe",
  ]);
  // Both targets get the exact same rendered markdown — this module doesn't
  // attempt to split the fused Hub page's prose (see component-map.js's doc).
  t.true(result.targets.every((entry) => typeof entry.category === "string"));
});

test("syncSlug returns status:unavailable when the Hub no longer has the RSP page", async (t) => {
  const client = createFakeClient({});

  const result = await syncSlug({
    client,
    slug: "accordion",
    componentsDir: COMPONENTS_DIR,
  });

  t.is(result.status, "unavailable");
  t.deepEqual(result.targets, []);
  t.deepEqual(result.flags, []);
});

test("syncSlug returns status:unrecognized for a slug component-map.js doesn't know about", async (t) => {
  const client = createFakeClient({
    [`${RSP_COMPONENT_PREFIX}/not-a-real-slug`]: ACCORDION_HTML,
  });

  const result = await syncSlug({
    client,
    slug: "not-a-real-slug",
    componentsDir: COMPONENTS_DIR,
  });

  t.is(result.status, "unrecognized");
  t.deepEqual(result.targets, []);
});

test("syncSlug surfaces a diverged flag when RSP/SWC content genuinely differs", async (t) => {
  const rspHtml = `<h1 id="accordion">Accordion</h1>
    <h2 id="usage-guidelines">Usage guidelines</h2>
    <p>Use accordions to organize related content into collapsible sections.</p>`;
  const swcHtml = `<h1 id="accordion">Accordion</h1>
    <h2 id="usage-guidelines">Usage guidelines</h2>
    <p>SWC accordions behave differently and should never be nested more than two levels deep.</p>`;

  const client = createFakeClient({
    [`${RSP_COMPONENT_PREFIX}/accordion`]: rspHtml,
    [`${SWC_COMPONENT_PREFIX}/accordion`]: swcHtml,
  });

  const result = await syncSlug({
    client,
    slug: "accordion",
    componentsDir: COMPONENTS_DIR,
  });

  t.is(result.status, "written");
  t.true(result.flags.length > 0);
  t.true(
    result.flags.every((flag) =>
      ["diverged", "swc-only-section"].includes(flag.type),
    ),
  );
  t.true(
    result.flags.some(
      (flag) => flag.type === "diverged" && flag.heading === "Usage guidelines",
    ),
  );
});
