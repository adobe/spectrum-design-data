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
import { buildGuideline } from "../src/guideline-builder.js";
import { parseDoc } from "../src/md-parser.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDoc(frontmatter = {}, body = "") {
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => {
      if (Array.isArray(v))
        return `${k}:\n${v.map((i) => `- ${i}`).join("\n")}`;
      return `${k}: ${JSON.stringify(v)}`;
    })
    .join("\n");
  const md = fm ? `---\n${fm}\n---\n${body}` : body;
  return parseDoc(md);
}

// ── Stub detection ────────────────────────────────────────────────────────────

test("buildGuideline returns isStub=true and doc=null for stub pages", (t) => {
  const parsedDoc = makeDoc(
    { title: "Colors", category: "designing" },
    "Content should be scraped from the live site",
  );
  const { doc, isStub, blocks } = buildGuideline(parsedDoc, "colors");
  t.true(isStub);
  t.is(doc, null);
  t.is(blocks.length, 0);
});

test("buildGuideline returns isStub=true when no blocks can be extracted", (t) => {
  const parsedDoc = makeDoc(
    { title: "Empty", category: "designing" },
    "# Empty\n\n## Resources\n\n### Design\n\n* Figma",
  );
  const { doc, isStub } = buildGuideline(parsedDoc, "empty");
  t.true(isStub);
  t.is(doc, null);
});

// ── Required fields ───────────────────────────────────────────────────────────

test("buildGuideline sets required fields from frontmatter", (t) => {
  const parsedDoc = makeDoc(
    { title: "Colors", category: "designing" },
    "# Colors\n\n## Overview\n\nThe Spectrum 2 color system enables visual harmony.",
  );
  const { doc, isStub } = buildGuideline(parsedDoc, "colors");
  t.false(isStub);
  t.truthy(doc);
  t.is(doc.name, "colors");
  t.is(doc.title, "Colors");
  t.is(doc.category, "designing");
  t.truthy(doc.$id);
  t.truthy(doc.$schema);
  t.true(doc.$id.endsWith("colors.json"));
});

test("buildGuideline produces a purpose block from ## Overview", (t) => {
  const parsedDoc = makeDoc(
    { title: "Motion", category: "designing" },
    "# Motion\n\n## Overview\n\nMotion in Spectrum 2 is purposeful and seamless.",
  );
  const { doc } = buildGuideline(parsedDoc, "motion");
  t.truthy(doc);
  const purpose = doc.documentBlocks.find((b) => b.type === "purpose");
  t.truthy(purpose, "should have a purpose block");
  t.true(purpose.content.includes("purposeful"));
});

// ── Title fallback for purpose block ─────────────────────────────────────────

test("buildGuideline uses title as purpose-block seed when no ## Overview", (t) => {
  const parsedDoc = makeDoc(
    { title: "Spacing", category: "designing" },
    "# Spacing\n\n## Usage guidelines\n\nUse spacing tokens for consistent visual rhythm across components.",
  );
  const { doc } = buildGuideline(parsedDoc, "spacing");
  t.truthy(doc);
  const purpose = doc.documentBlocks.find((b) => b.type === "purpose");
  t.truthy(purpose, "should have a purpose block seeded from title");
  t.is(purpose.content, "Spacing");
});

// ── Optional fields ───────────────────────────────────────────────────────────

test("buildGuideline maps sourceUrl, lastUpdated, status, tags from frontmatter", (t) => {
  const parsedDoc = makeDoc(
    {
      title: "Colors",
      category: "designing",
      source_url: "https://spectrum.adobe.com/page/colors/",
      last_updated: "2026-02-02",
      status: "published",
      tags: ["designing", "color"],
    },
    "# Colors\n\n## Overview\n\nThe Spectrum 2 color system enables visual harmony.",
  );
  const { doc } = buildGuideline(parsedDoc, "colors");
  t.truthy(doc);
  t.is(doc.sourceUrl, "https://spectrum.adobe.com/page/colors/");
  t.is(doc.lastUpdated, "2026-02-02");
  t.is(doc.status, "published");
  t.deepEqual(doc.tags, ["designing", "color"]);
});

test("buildGuideline omits optional fields when absent", (t) => {
  const parsedDoc = makeDoc(
    { title: "Colors", category: "designing" },
    "# Colors\n\n## Overview\n\nThe color system.",
  );
  const { doc } = buildGuideline(parsedDoc, "colors");
  t.truthy(doc);
  t.false("sourceUrl" in doc);
  t.false("lastUpdated" in doc);
  t.false("status" in doc);
  t.false("tags" in doc);
  t.false("related" in doc);
});

// ── related passthrough ───────────────────────────────────────────────────────

test("buildGuideline maps related_components → related[].ref without validation", (t) => {
  const parsedDoc = makeDoc(
    {
      title: "Colors",
      category: "designing",
      related_components: ["grays", "background-layers", "button"],
    },
    "# Colors\n\n## Overview\n\nThe color system.",
  );
  const { doc } = buildGuideline(parsedDoc, "colors");
  t.truthy(doc);
  t.truthy(doc.related);
  t.is(doc.related.length, 3);
  t.deepEqual(
    doc.related.map((r) => r.ref),
    ["grays", "background-layers", "button"],
  );
  // No 'kind' field added by buildGuideline
  t.false("kind" in doc.related[0]);
});

test("buildGuideline omits related when related_components is empty", (t) => {
  const parsedDoc = makeDoc(
    { title: "Colors", category: "designing", related_components: [] },
    "# Colors\n\n## Overview\n\nThe color system.",
  );
  const { doc } = buildGuideline(parsedDoc, "colors");
  t.truthy(doc);
  t.false("related" in doc);
});

// ── Category fallback ─────────────────────────────────────────────────────────

test("buildGuideline defaults category to designing when frontmatter category absent", (t) => {
  const parsedDoc = makeDoc(
    { title: "Unnamed" },
    "# Unnamed\n\n## Overview\n\nGeneric content about something.",
  );
  const { doc } = buildGuideline(parsedDoc, "unnamed");
  t.truthy(doc);
  t.is(doc.category, "designing");
});
