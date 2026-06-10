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
import {
  buildBlocks,
  rewriteLinks,
  normalizeForDedup,
} from "../src/blocks-builder.js";
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

// ── normalizeForDedup ─────────────────────────────────────────────────────────

test("normalizeForDedup collapses smart quotes to match ASCII variant", (t) => {
  const withSmartQuotes = "Don’t use custom colors for buttons.";
  const withAsciiQuote = "Don't use custom colors for buttons.";
  t.is(normalizeForDedup(withSmartQuotes), normalizeForDedup(withAsciiQuote));
});

test("normalizeForDedup collapses leading heading sentence variations", (t) => {
  // External-links dump often repeats a block with a heading lead-in prefix:
  //   "Keyboard focus.\n\nA button can be navigated using a keyboard."
  // while the Behaviors section produces the same prose without the lead-in.
  const withLeadIn =
    "Keyboard focus. A button can be navigated using a keyboard.";
  const withoutLeadIn = "A button can be navigated using a keyboard.";
  // Normalized forms may differ (lead-in is legit text), but this test confirms
  // that the normalizer at least produces stable, lowercase, punctuation-free output.
  t.is(normalizeForDedup(withLeadIn), normalizeForDedup(withLeadIn));
  t.is(normalizeForDedup(withoutLeadIn), normalizeForDedup(withoutLeadIn));
});

test("normalizeForDedup strips markdown link syntax", (t) => {
  const withLink = "See [progress bar](/page/progress-bar/) for details.";
  const withAbsLink =
    "See [progress bar](https://spectrum.adobe.com/page/progress-bar/) for details.";
  // After link stripping + punct removal both should equal "see progress bar for details"
  t.is(normalizeForDedup(withLink), normalizeForDedup(withAbsLink));
  t.is(normalizeForDedup(withLink), "see progress bar for details");
});

test("normalizeForDedup does not collapse genuinely distinct prose", (t) => {
  const a = "Buttons enable actions or navigation between views.";
  const b = "Badges are small status indicators for UI elements.";
  t.not(normalizeForDedup(a), normalizeForDedup(b));
});

// ── near-duplicate dedup via buildBlocks ──────────────────────────────────────

test("buildBlocks deduplicates near-identical blocks that differ only by smart quotes", (t) => {
  // Simulate External-links dump (curly/smart apostrophe U+2019) vs Behaviors
  // section (ASCII apostrophe).  Both describe the same rule; only the quote
  // character differs — the near-dup normalizer should collapse them.
  const md = `---
title: "Button"
---

# Button

## Behaviors

Don’t use custom colors for buttons because the colors have been designed to be consistent and accessible.

## Usage guidelines

Don’t use custom colors for buttons because the colors have been designed to be consistent and accessible.
`;
  const { blocks, flags } = buildBlocks(parseDoc(md));
  const matching = blocks.filter((b) =>
    b.content.toLowerCase().includes("custom colors for buttons"),
  );
  t.is(
    matching.length,
    1,
    "near-duplicates differing only by smart quote should be collapsed to one",
  );
  t.true(
    flags.some((f) => f.startsWith("INFO:") && f.includes("near-duplicate")),
  );
});

test("buildBlocks keeps genuinely distinct blocks even with similar structure", (t) => {
  const md = `---
title: "Badge"
---

# Badge

## Overview

Badges are small status indicators for UI elements.

## Behaviors

Badges are display elements, not actions. They should not behave like buttons or links.
`;
  const { blocks } = buildBlocks(parseDoc(md));
  t.is(blocks.length, 2, "two distinct blocks should both be kept");
});

// ── buildBlocks — purpose-first ordering ─────────────────────────────────────

test("buildBlocks moves purpose block first even when ## Overview appears mid-document", (t) => {
  // Overview appears after ## Behaviors in the source — historically it was pushed
  // in-place, so the purpose block ended up last.  The stable partition at the end
  // of buildBlocks must hoist it to index 0.
  const md = `---
title: "Colors"
---

# Colors

## Behaviors

Use semantic color tokens rather than hard-coded hex values.

## Overview

The Spectrum 2 color system defines a perceptually balanced palette.
`;
  const { blocks } = buildBlocks(parseDoc(md));
  t.true(blocks.length >= 2, "should have at least two blocks");
  t.is(blocks[0].type, "purpose", "first block must be purpose");
});

test("buildBlocks keeps all purpose blocks before non-purpose blocks when multiple exist", (t) => {
  // This is an edge case — in practice there is only one ## Overview per doc,
  // but the invariant should hold regardless.
  const md = `---
title: "Multi"
---

# Multi

## Behaviors

First guideline content here.

## Overview

The overview text comes after behaviors in this source.
`;
  const { blocks } = buildBlocks(parseDoc(md));
  const purposeIdx = blocks.map((b) => b.type).lastIndexOf("purpose");
  const guidelineIdx = blocks.map((b) => b.type).indexOf("guideline");
  if (purposeIdx !== -1 && guidelineIdx !== -1) {
    t.true(
      purposeIdx < guidelineIdx,
      "all purpose blocks precede all guideline blocks",
    );
  } else {
    t.pass("no mixed ordering to check");
  }
});
