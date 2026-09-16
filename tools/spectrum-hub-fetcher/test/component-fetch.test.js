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

import {
  RSP_COMPONENT_PREFIX,
  SWC_COMPONENT_PREFIX,
  fetchComponentPage,
  fetchComponentPair,
} from "../src/component-fetch.js";

/**
 * A minimal fake `client` shaped like `aem-client.js`'s real one, backed by
 * an in-memory map of path -> HTML rather than the network. Mirrors the
 * `createFixtureFetch` pattern in `test/hub-fetcher.test.js`, adapted to the
 * `{ fetchPage }`-shaped client this module expects (rather than a bare
 * fetch function), since `inlineFragments` needs `client.fetchPage` to also
 * resolve fragment paths.
 */
function createFakeClient(pages) {
  return {
    async fetchPage(path) {
      const html = pages[path];
      return html ? { html } : null;
    },
  };
}

const ACCORDION_HTML = readFileSync(
  new URL(
    "./fixtures/web/swc/components/accordion.plain.html",
    import.meta.url,
  ),
  "utf8",
);

test("fetchComponentPage returns exists:false for a page the Hub doesn't have", async (t) => {
  const client = createFakeClient({});

  const result = await fetchComponentPage(
    client,
    SWC_COMPONENT_PREFIX,
    "not-on-swc",
  );

  t.false(result.exists);
  t.deepEqual(result.sections, []);
  t.true(result.isStub);
  t.is(result.fragments, null);
  t.is(result.title, "");
});

test("fetchComponentPage resolves fragments and splits sections for an existing page", async (t) => {
  const client = createFakeClient({
    [`${SWC_COMPONENT_PREFIX}/accordion`]: ACCORDION_HTML,
  });

  const result = await fetchComponentPage(
    client,
    SWC_COMPONENT_PREFIX,
    "accordion",
  );

  t.true(result.exists);
  t.false(result.isStub);
  t.true(result.sections.length > 0);
  t.true(result.sections.some((section) => section.heading === "Anatomy"));
  t.truthy(result.fragments);
});

test("fetchComponentPair fetches RSP and SWC independently, tolerating SWC absence", async (t) => {
  const client = createFakeClient({
    [`${RSP_COMPONENT_PREFIX}/accordion`]: ACCORDION_HTML,
    // No SWC entry — simulates the Hub not publishing this platform's page.
  });

  const { slug, rsp, swc } = await fetchComponentPair(client, "accordion");

  t.is(slug, "accordion");
  t.true(rsp.exists);
  t.false(swc.exists);
  t.deepEqual(swc.sections, []);
});

test("fetchComponentPair fetches both platforms when both exist", async (t) => {
  const client = createFakeClient({
    [`${RSP_COMPONENT_PREFIX}/accordion`]: ACCORDION_HTML,
    [`${SWC_COMPONENT_PREFIX}/accordion`]: ACCORDION_HTML,
  });

  const { rsp, swc } = await fetchComponentPair(client, "accordion");

  t.true(rsp.exists);
  t.true(swc.exists);
  t.deepEqual(rsp.sections, swc.sections);
});
