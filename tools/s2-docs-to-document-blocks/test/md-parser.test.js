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
import { splitFrontmatter, parseSections, parseDoc } from "../src/md-parser.js";

// ── splitFrontmatter ────────────────────────────────────────────────────────

test("splitFrontmatter extracts YAML frontmatter and body", (t) => {
  const md = `---
title: "Button"
status: published
---

# Button

## Overview

Some prose here.
`;
  const { frontmatter, body } = splitFrontmatter(md);
  t.is(frontmatter.title, "Button");
  t.is(frontmatter.status, "published");
  t.true(body.includes("# Button"));
  t.true(body.includes("Some prose here."));
});

test("splitFrontmatter returns empty frontmatter when no YAML block", (t) => {
  const md = "# Title\n\nsome content";
  const { frontmatter, body } = splitFrontmatter(md);
  t.deepEqual(frontmatter, {});
  t.is(body, md);
});

// ── parseSections ────────────────────────────────────────────────────────────

test("parseSections extracts top-level sections", (t) => {
  const body = `# Component

## Overview

Overview prose.

## Behaviors

### Focus

Focus behavior details.
`;
  const sections = parseSections(body);
  t.is(sections.length, 2);
  t.is(sections[0].heading, "Overview");
  t.true(sections[0].content.includes("Overview prose."));
  t.is(sections[1].heading, "Behaviors");
});

test("parseSections extracts ### subsections", (t) => {
  const body = `## Behaviors

### Keyboard focus

A button can be navigated using a keyboard.

### Flexible width

Width adjusts to fit the label text.
`;
  const sections = parseSections(body);
  t.is(sections.length, 1);
  const [behaviors] = sections;
  t.is(behaviors.subsections.length, 2);
  t.is(behaviors.subsections[0].heading, "Keyboard focus");
  t.true(behaviors.subsections[0].content.includes("can be navigated"));
  t.is(behaviors.subsections[1].heading, "Flexible width");
});

test("parseSections returns empty array for body with no ## headings", (t) => {
  const sections = parseSections("# Just a title\n\nsome text");
  t.deepEqual(sections, []);
});

// ── parseDoc ─────────────────────────────────────────────────────────────────

test("parseDoc detects stub files", (t) => {
  const md = `---
title: "Color Handle"
status: published
---

# Color Handle

Content should be scraped from the live site when VPN/browser access is available.
`;
  const doc = parseDoc(md);
  t.true(doc.isStub);
  t.is(doc.title, "Color Handle");
});

test("parseDoc extracts title from h1 heading", (t) => {
  const md = `---
title: "Button"
---

# Button

## Overview

Button text.
`;
  const doc = parseDoc(md);
  t.is(doc.title, "Button");
  t.false(doc.isStub);
  t.is(doc.sections.length, 1);
});
