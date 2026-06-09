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
import { buildBlocks, rewriteLinks } from "../src/blocks-builder.js";
import { parseDoc } from "../src/md-parser.js";

// ── rewriteLinks ──────────────────────────────────────────────────────────────

test("rewriteLinks rewrites /page/slug/ to absolute URL", (t) => {
  const input = "See [progress bar](/page/progress-bar/) for details.";
  const output = rewriteLinks(input);
  t.true(output.includes("https://spectrum.adobe.com/page/progress-bar/"));
  t.false(output.includes("(/page/"));
});

test("rewriteLinks does not touch already-absolute URLs", (t) => {
  const input = "See [docs](https://spectrum.adobe.com/page/button/).";
  t.is(rewriteLinks(input), input);
});

// ── buildBlocks — stub handling ───────────────────────────────────────────────

test("buildBlocks returns no blocks for stub pages", (t) => {
  const md = `---
title: "Color Handle"
---

# Color Handle

Content should be scraped from the live site when VPN/browser access is available.
`;
  const { blocks, flags } = buildBlocks(parseDoc(md));
  t.is(blocks.length, 0);
  t.true(flags.some((f) => f.startsWith("STUB")));
});

// ── buildBlocks — purpose block ───────────────────────────────────────────────

test("buildBlocks extracts overview as purpose block", (t) => {
  const md = `---
title: "Button"
---

# Button

## Overview

Buttons enable actions or navigation between views.

## Resources

### Design

* **Figma**: S2 Web
`;
  const { blocks } = buildBlocks(parseDoc(md));
  t.is(blocks.length, 1);
  t.is(blocks[0].type, "purpose");
  t.true(blocks[0].content.includes("Buttons enable actions"));
});

// ── buildBlocks — guideline blocks from behaviors ─────────────────────────────

test("buildBlocks creates guideline blocks from ## Behaviors subsections", (t) => {
  const md = `---
title: "Button"
---

# Button

## Behaviors

### Flexible width

The width of a button automatically adjusts to fit the label text.

### Text overflow

When the button text is too long, it wraps.
`;
  const { blocks } = buildBlocks(parseDoc(md));
  t.is(blocks.length, 2);
  t.true(blocks.every((b) => b.type === "guideline"));
  t.true(blocks[0].content.includes("Flexible width"));
  t.true(blocks[1].content.includes("Text overflow"));
});

// ── buildBlocks — do-dont blocks ──────────────────────────────────────────────

test('buildBlocks creates do-dont block for "Don\'t…" usage guideline headings', (t) => {
  const md = `---
title: "Button"
---

# Button

## Usage guidelines

### Don't override color

Do not use custom colors for buttons.
`;
  const { blocks } = buildBlocks(parseDoc(md));
  t.is(blocks.length, 1);
  t.is(blocks[0].type, "do-dont");
  t.is(blocks[0].content, "Don't override color");
  t.true(blocks[0].dont.includes("Do not use custom colors"));
});

test('buildBlocks creates do-dont block for "Avoid…" usage guideline headings', (t) => {
  const md = `---
title: "Badge"
---

# Badge

## Usage guidelines

### Avoid overusing badges

Only one badge per card.
`;
  const { blocks } = buildBlocks(parseDoc(md));
  t.is(blocks[0].type, "do-dont");
  t.is(blocks[0].content, "Avoid overusing badges");
  t.is(blocks[0].dont, "Only one badge per card.");
});

test("buildBlocks creates guideline for non-dont usage guideline headings", (t) => {
  const md = `---
title: "Button"
---

# Button

## Usage guidelines

### Use icons only when necessary

Icons should not be used for decoration.
`;
  const { blocks } = buildBlocks(parseDoc(md));
  t.is(blocks.length, 1);
  t.is(blocks[0].type, "guideline");
  t.true(blocks[0].content.includes("Use icons only when necessary"));
});

// ── buildBlocks — link rewriting ──────────────────────────────────────────────

test("buildBlocks rewrites relative /page/ links in extracted content", (t) => {
  const md = `---
title: "Button"
---

# Button

## Behaviors

### Flexible width

Width adjusts. See [progress bar](/page/progress-bar/) for comparison.
`;
  const { blocks } = buildBlocks(parseDoc(md));
  t.false(blocks.some((b) => b.content.includes("(/page/")));
  t.true(
    blocks.some((b) =>
      b.content.includes("https://spectrum.adobe.com/page/progress-bar/"),
    ),
  );
});

// ── buildBlocks — skip boilerplate sections ───────────────────────────────────

test("buildBlocks skips ## Resources, ## States, ## Changelog", (t) => {
  const md = `---
title: "Button"
---

# Button

## Resources

### Design

* Figma: S2 Web

## States

| State | Support |
| --- | --- |
| Default | Supported |

## Changelog

| Date | Notes |
| --- | --- |
| 2025 | initial |
`;
  const { blocks } = buildBlocks(parseDoc(md));
  t.is(blocks.length, 0);
});

// ── buildBlocks — duplicate deduplication ────────────────────────────────────

test("buildBlocks auto-removes duplicate blocks and emits INFO flag", (t) => {
  const duplicatePara =
    "Blue badges are easily confused with Spectrum accent buttons.";
  const md = `---
title: "Badge"
---

# Badge

## Behaviors

${duplicatePara}

## Usage guidelines

${duplicatePara}
`;
  const { blocks, flags } = buildBlocks(parseDoc(md));
  // The duplicate should be removed, leaving only one copy
  const matchingBlocks = blocks.filter((b) =>
    b.content.includes("Blue badges"),
  );
  t.is(matchingBlocks.length, 1);
  // An INFO flag (not REVIEW) should note the removal
  t.true(flags.some((f) => f.startsWith("INFO:") && f.includes("duplicate")));
  t.false(
    flags.some((f) => f.startsWith("REVIEW:") && f.includes("duplicate")),
  );
});

// ── buildBlocks — no overview / purpose seeding ───────────────────────────────

test("buildBlocks seeds purpose block from description when no Overview section", (t) => {
  const md = `---
title: "Badge"
---

# Badge

## Behaviors

### Focus

Focus ring applied on keyboard navigation.
`;
  const { blocks, flags } = buildBlocks(parseDoc(md), {
    description: "Badges are small status indicators for UI elements.",
  });
  t.is(blocks[0].type, "purpose");
  t.is(
    blocks[0].content,
    "Badges are small status indicators for UI elements.",
  );
  // No REVIEW flag about missing purpose block when description supplies it
  t.false(flags.some((f) => f.includes("purpose block")));
});

test("buildBlocks flags missing overview when no description provided", (t) => {
  const md = `---
title: "Badge"
---

# Badge

## Behaviors

### Focus

Focus ring applied on keyboard navigation.
`;
  const { flags } = buildBlocks(parseDoc(md));
  t.true(flags.some((f) => f.includes("purpose block")));
});

test("buildBlocks does not duplicate purpose when Overview section already present", (t) => {
  const md = `---
title: "Button"
---

# Button

## Overview

Buttons enable actions or navigation between views.

## Behaviors

### Focus

Focus ring applied on keyboard navigation.
`;
  const { blocks, flags } = buildBlocks(parseDoc(md), {
    description:
      "This description should not appear — Overview takes precedence.",
  });
  const purposeBlocks = blocks.filter((b) => b.type === "purpose");
  t.is(purposeBlocks.length, 1);
  t.true(purposeBlocks[0].content.includes("Buttons enable actions"));
  t.false(flags.some((f) => f.includes("purpose block")));
});
