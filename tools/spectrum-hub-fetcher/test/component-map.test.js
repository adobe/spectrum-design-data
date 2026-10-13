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
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  COMPONENT_SLUG_MAP,
  COMPONENT_SLUG_FANOUT,
  COMPONENTS_WITHOUT_HUB_PAGE,
  resolveComponentTargets,
} from "../src/component-map.js";

const COMPONENTS_DIR = fileURLToPath(
  new URL("../../../packages/design-data/components/", import.meta.url),
);

function allMappedSlugs() {
  return Object.values(COMPONENT_SLUG_MAP).flat();
}

// ── table integrity ─────────────────────────────────────────────────────────

test("COMPONENT_SLUG_MAP has no duplicate hub slugs across categories", (t) => {
  const slugs = allMappedSlugs();
  t.is(new Set(slugs).size, slugs.length);
});

test("COMPONENT_SLUG_MAP and COMPONENT_SLUG_FANOUT keys are disjoint", (t) => {
  const mapped = new Set(allMappedSlugs());
  for (const hubSlug of Object.keys(COMPONENT_SLUG_FANOUT)) {
    t.false(
      mapped.has(hubSlug),
      `${hubSlug} should not appear in both COMPONENT_SLUG_MAP and COMPONENT_SLUG_FANOUT`,
    );
  }
});

test("COMPONENT_SLUG_MAP and COMPONENTS_WITHOUT_HUB_PAGE are disjoint", (t) => {
  const mapped = new Set(allMappedSlugs());
  const withoutHub = new Set(COMPONENTS_WITHOUT_HUB_PAGE);
  for (const slug of mapped) {
    t.false(withoutHub.has(slug), `${slug} cannot be both mapped and unmapped`);
  }
});

test("COMPONENTS_WITHOUT_HUB_PAGE has no duplicates", (t) => {
  t.is(
    new Set(COMPONENTS_WITHOUT_HUB_PAGE).size,
    COMPONENTS_WITHOUT_HUB_PAGE.length,
  );
});

// ── resolver ─────────────────────────────────────────────────────────────────

test("resolveComponentTargets returns the single matching slug for a 1:1 mapping", (t) => {
  t.deepEqual(resolveComponentTargets("button"), ["button"]);
  t.deepEqual(resolveComponentTargets("cards"), ["cards"]);
  t.deepEqual(resolveComponentTargets("calendar"), ["calendar"]);
});

test("resolveComponentTargets fans out the curated color-handle-and-loupe override", (t) => {
  t.deepEqual(resolveComponentTargets("color-handle-and-loupe"), [
    "color-handle",
    "color-loupe",
  ]);
});

test("resolveComponentTargets returns an empty array for an unrecognized slug", (t) => {
  t.deepEqual(resolveComponentTargets("not-a-real-component"), []);
});

// ── live cross-reference against the real local component files ────────────
// These assert the table stays in sync with `packages/design-data/components/`
// itself, so a renamed/removed/added local file surfaces as a failing test
// instead of a silently stale mapping.

test("every mapped target and fan-out target has a real local component file", (t) => {
  const targets = [
    ...allMappedSlugs(),
    ...Object.values(COMPONENT_SLUG_FANOUT).flat(),
  ];
  for (const slug of targets) {
    t.true(
      existsSync(`${COMPONENTS_DIR}${slug}.json`),
      `expected packages/design-data/components/${slug}.json to exist`,
    );
  }
});

test("every COMPONENTS_WITHOUT_HUB_PAGE entry has a real local component file", (t) => {
  for (const slug of COMPONENTS_WITHOUT_HUB_PAGE) {
    t.true(
      existsSync(`${COMPONENTS_DIR}${slug}.json`),
      `expected packages/design-data/components/${slug}.json to exist`,
    );
  }
});

test("mapped + fanout + without-hub-page accounts for every local component file", (t) => {
  const localSlugs = readdirSync(COMPONENTS_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.slice(0, -".json".length));

  const accounted = new Set([
    ...allMappedSlugs(),
    ...Object.values(COMPONENT_SLUG_FANOUT).flat(),
    ...COMPONENTS_WITHOUT_HUB_PAGE,
  ]);

  const missing = localSlugs.filter((slug) => !accounted.has(slug));
  t.deepEqual(
    missing,
    [],
    `local component file(s) not represented anywhere in component-map.js: ${missing.join(", ")}`,
  );
});
