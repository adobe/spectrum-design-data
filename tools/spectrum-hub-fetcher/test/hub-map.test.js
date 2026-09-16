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
import { parse } from "node-html-parser";

import {
  assignSlugs,
  buildPageMap,
  categoryForPath,
  dedupeByContent,
  similarity,
} from "../src/hub-map.js";
import { splitSections, stripNoise, isStubSections } from "../src/sections.js";

const CATEGORY_ENUM = new Set([
  "designing",
  "fundamentals",
  "developing",
  "support",
]);

function sectionsFor(fixture) {
  const html = readFileSync(new URL(fixture, import.meta.url), "utf8");
  const root = parse(html);
  stripNoise(root);
  return splitSections(root);
}

// ── category mapping ────────────────────────────────────────────────────────

test("categoryForPath maps each supported prefix to a schema-valid category", (t) => {
  t.is(categoryForPath("/foundations/color/colors"), "designing");
  t.is(categoryForPath("/content/voice-and-tone"), "designing");
  t.is(categoryForPath("/support/faqs"), "support");

  for (const path of ["/foundations/x", "/content/x", "/support/x"]) {
    t.true(CATEGORY_ENUM.has(categoryForPath(path)));
  }
});

test("categoryForPath honours the curated category override table", (t) => {
  // Hub prefix says "support", but the content is developer-facing.
  t.is(categoryForPath("/support/developer-overview"), "developing");
  t.is(categoryForPath("/support/faqs"), "support");
});

test("categoryForPath returns null for out-of-scope prefixes", (t) => {
  t.is(categoryForPath("/web/swc/components/accordion"), null);
  t.is(categoryForPath("/getting-started/intro"), null);
});

// ── stub detection ──────────────────────────────────────────────────────────

test("isStubSections flags a heading-only hub shell page", (t) => {
  // Real shape served by e.g. /foundations/support/faqs (40 bytes).
  const root = parse('<div>\n  <h1 id="faqs">FAQs</h1>\n</div>');
  stripNoise(root);
  t.true(isStubSections(splitSections(root)));
});

test("isStubSections flags an h2-less landing page of authoring boilerplate", (t) => {
  // Shape served by /foundations/behavior: h3s only, no h2, so the downstream
  // block builder would produce nothing from it.
  const root = parse(
    '<div><h1 id="behavior">Behavior</h1>' +
      '<h3 id="xs">Extra small</h3><p>The default size is extra small.</p></div>',
  );
  stripNoise(root);
  t.true(isStubSections(splitSections(root)));
});

test("isStubSections keeps a page with real content", (t) => {
  t.false(
    isStubSections(
      sectionsFor("./fixtures/web/swc/components/accordion.plain.html"),
    ),
  );
});

// ── slug assignment ─────────────────────────────────────────────────────────

test("assignSlugs uses the terminal segment when it is unambiguous", (t) => {
  const slugs = assignSlugs(["/foundations/behavior/motion", "/support/faqs"]);
  t.is(slugs.get("/foundations/behavior/motion"), "motion");
  t.is(slugs.get("/support/faqs"), "faqs");
});

test("assignSlugs parent-qualifies colliding terminal segments", (t) => {
  // "overview" collides four ways on the real hub.
  const slugs = assignSlugs([
    "/foundations/app-frame/overview",
    "/foundations/typography/overview",
    "/foundations/styles/object-styles/overview",
  ]);

  // Matches the convention already used by packages/design-data/guidelines.
  t.is(slugs.get("/foundations/app-frame/overview"), "app-frame-overview");
  t.is(slugs.get("/foundations/typography/overview"), "typography-overview");
  t.is(
    slugs.get("/foundations/styles/object-styles/overview"),
    "object-styles-overview",
  );
});

test("assignSlugs never emits a duplicate slug", (t) => {
  const paths = [
    "/foundations/a/overview",
    "/foundations/b/overview",
    "/foundations/c/overview",
    "/foundations/color/color",
    "/content/color",
    "/support/color",
  ];
  const slugs = assignSlugs(paths);

  t.is(slugs.size, paths.length);
  t.is(new Set(slugs.values()).size, paths.length);
  for (const slug of slugs.values()) {
    t.regex(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  }
});

test("assignSlugs honours the curated override table", (t) => {
  const slugs = assignSlugs([
    "/foundations/support/contact-us",
    "/support/contact-us",
  ]);
  t.is(slugs.get("/foundations/support/contact-us"), "foundations-contact-us");
  t.is(slugs.get("/support/contact-us"), "contact-us");
});

// ── near-duplicate collapse ─────────────────────────────────────────────────

test("similarity scores identical prose at 1 and disjoint prose at 0", (t) => {
  t.is(similarity("alpha beta gamma", "alpha beta gamma"), 1);
  t.is(similarity("alpha beta", "delta epsilon"), 0);
});

test("dedupeByContent keeps the most recently modified of a duplicate pair", (t) => {
  const shared =
    "Colour carries meaning and should be applied consistently across the system.";
  const { kept, dropped } = dedupeByContent([
    { path: "/foundations/color/color", text: shared, lastModified: 100 },
    { path: "/foundations/color/colors", text: shared, lastModified: 200 },
  ]);

  t.is(kept.length, 1);
  t.is(kept[0].path, "/foundations/color/colors");
  t.is(dropped[0].path, "/foundations/color/color");
  t.is(dropped[0].duplicateOf, "/foundations/color/colors");
});

test("dedupeByContent leaves genuinely distinct pages alone", (t) => {
  const { kept, dropped } = dedupeByContent([
    {
      path: "/a",
      text: "Typography establishes hierarchy through size and weight.",
      lastModified: 1,
    },
    {
      path: "/b",
      text: "Motion communicates state change with easing and duration.",
      lastModified: 2,
    },
  ]);

  t.is(kept.length, 2);
  t.is(dropped.length, 0);
});

// ── end-to-end mapping ──────────────────────────────────────────────────────

test("buildPageMap drops stubs and duplicates, then maps the survivors", (t) => {
  const prose =
    "Spacing tokens establish a consistent vertical and horizontal rhythm.";
  const { mapped, dropped } = buildPageMap([
    {
      path: "/foundations/support/faqs",
      isStub: true,
      text: "",
      lastModified: 10,
    },
    {
      path: "/support/faqs",
      isStub: false,
      text: "Frequently asked questions about Spectrum.",
      lastModified: 20,
    },
    {
      path: "/foundations/system/spacing",
      isStub: false,
      text: prose,
      lastModified: 10,
    },
    {
      path: "/content/spacing-rhythm",
      isStub: false,
      text: prose,
      lastModified: 30,
    },
    {
      path: "/web/swc/components/accordion",
      isStub: false,
      text: "Accordion prose.",
      lastModified: 40,
    },
  ]);

  t.false(mapped.has("/foundations/support/faqs"));
  t.is(mapped.get("/support/faqs").slug, "faqs");
  t.is(mapped.get("/support/faqs").category, "support");

  // Newer duplicate wins.
  t.true(mapped.has("/content/spacing-rhythm"));
  t.false(mapped.has("/foundations/system/spacing"));

  // Out-of-scope prefix is reported, not silently ignored.
  t.false(mapped.has("/web/swc/components/accordion"));

  const reasons = Object.fromEntries(
    dropped.map((entry) => [entry.path, entry.reason]),
  );
  t.is(reasons["/foundations/support/faqs"], "stub-page");
  t.is(reasons["/foundations/system/spacing"], "near-duplicate");
  t.is(reasons["/web/swc/components/accordion"], "unmapped-prefix");
});

test("buildPageMap emits only schema-valid categories and unique slugs", (t) => {
  const pages = [
    {
      path: "/foundations/color/colors",
      isStub: false,
      text: "Colour guidance one.",
      lastModified: 1,
    },
    {
      path: "/content/voice-and-tone",
      isStub: false,
      text: "Voice guidance two.",
      lastModified: 2,
    },
    {
      path: "/support/resources",
      isStub: false,
      text: "Resource links three.",
      lastModified: 3,
    },
  ];
  const { mapped } = buildPageMap(pages);

  t.is(mapped.size, 3);
  t.is(new Set([...mapped.values()].map((entry) => entry.slug)).size, 3);
  for (const entry of mapped.values()) {
    t.true(CATEGORY_ENUM.has(entry.category));
  }
});
