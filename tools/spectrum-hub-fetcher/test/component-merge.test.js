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
  NON_DIFFABLE_HEADINGS,
  mergeComponentSections,
} from "../src/component-merge.js";
import { SKIP_SECTIONS } from "../../s2-docs-to-document-blocks/src/blocks-builder.js";

function section(heading, level, text, anchor = "") {
  return { heading, level, anchor, text };
}

// ── drift guard ──────────────────────────────────────────────────────────────

test("NON_DIFFABLE_HEADINGS stays in sync with blocks-builder's SKIP_SECTIONS", (t) => {
  // component-merge.js intentionally duplicates this list instead of importing
  // it at runtime (see that module's doc comment). This test is the guard
  // against the two silently drifting apart.
  t.deepEqual(NON_DIFFABLE_HEADINGS, SKIP_SECTIONS);
});

// ── identical / no-signal cases ──────────────────────────────────────────────

test("identical shared-heading text produces no flags", (t) => {
  const rsp = [section("Overview", 2, "Buttons let users take actions.")];
  const swc = [section("Overview", 2, "Buttons let users take actions.")];

  const { sections, flags } = mergeComponentSections(rsp, swc);

  t.deepEqual(sections, rsp);
  t.deepEqual(flags, []);
});

test("shared-heading text differing only by scrape noise (quotes, case, punctuation) is not flagged", (t) => {
  const rsp = [section("Overview", 2, "Don't override the button's color.")];
  const swc = [section("Overview", 2, "DON'T OVERRIDE THE BUTTON’S COLOR")];

  const { flags } = mergeComponentSections(rsp, swc);

  t.deepEqual(flags, []);
});

test("heading match is case-insensitive", (t) => {
  const rsp = [section("Usage guidelines", 2, "Same text.")];
  const swc = [section("USAGE GUIDELINES", 2, "Same text.")];

  const { flags } = mergeComponentSections(rsp, swc);

  t.deepEqual(flags, []);
});

test("an RSP-only heading (SWC page missing that section) produces no flag", (t) => {
  const rsp = [
    section("Overview", 2, "Shared."),
    section("Content standards", 2, "RSP-only guidance."),
  ];
  const swc = [section("Overview", 2, "Shared.")];

  const { sections, flags } = mergeComponentSections(rsp, swc);

  t.deepEqual(sections, rsp);
  t.deepEqual(flags, []);
});

test("passing an empty SWC section list behaves identically to no SWC page at all", (t) => {
  const rsp = [section("Overview", 2, "Solo RSP content.")];

  const { sections, flags } = mergeComponentSections(rsp, []);

  t.deepEqual(sections, rsp);
  t.deepEqual(flags, []);
});

// ── real divergence ──────────────────────────────────────────────────────────

test("genuinely divergent shared-heading text is kept as RSP but flagged for review", (t) => {
  const rsp = [
    section("Behaviors", 3, "Static black is used on light backgrounds."),
  ];
  const swc = [
    section(
      "Behaviors",
      3,
      "SWC static color tokens map differently for dark themes.",
    ),
  ];

  const { sections, flags } = mergeComponentSections(rsp, swc);

  t.deepEqual(sections, rsp); // RSP still wins as the default base
  t.deepEqual(flags, [
    {
      type: "diverged",
      heading: "Behaviors",
      level: 3,
      rspText: "Static black is used on light backgrounds.",
      swcText: "SWC static color tokens map differently for dark themes.",
    },
  ]);
});

test("an SWC-only heading is flagged, not silently merged in or dropped", (t) => {
  // Modeled on a real, live-observed case: link's SWC page has a whole
  // "Behaviors" section (with subsections) that RSP's link page lacks
  // entirely.
  const rsp = [section("Usage guidelines", 2, "RSP guidance only.")];
  const swc = [
    section("Usage guidelines", 2, "RSP guidance only."),
    section("Behaviors", 2, "SWC-only behavior notes."),
    section("Single vs. multiple expansion", 3, "SWC-only subsection."),
  ];

  const { sections, flags } = mergeComponentSections(rsp, swc);

  t.deepEqual(sections, rsp);
  t.deepEqual(flags, [
    {
      type: "swc-only-section",
      heading: "Behaviors",
      level: 2,
      swcText: "SWC-only behavior notes.",
    },
    {
      type: "swc-only-section",
      heading: "Single vs. multiple expansion",
      level: 3,
      swcText: "SWC-only subsection.",
    },
  ]);
});

// ── non-diffable headings are never compared, even when they genuinely differ ──

test("Component options divergence is never flagged — platform-specific by design", (t) => {
  // Modeled on a real, live-observed case: link's RSP Component options
  // describes React-style props (staticColor, ...), SWC's describes CSS
  // class names (swc-Link--standalone, ...). Comparing them is comparing two
  // different APIs, not detecting a content mismatch.
  const rsp = [
    section(
      "Component options",
      2,
      "staticColor Use the static color option...",
    ),
  ];
  const swc = [
    section(
      "Component options",
      2,
      "swc-Link--standalone Standalone link typography...",
    ),
  ];

  const { sections, flags } = mergeComponentSections(rsp, swc);

  t.deepEqual(sections, rsp);
  t.deepEqual(flags, []);
});

test("every NON_DIFFABLE_HEADINGS entry is excluded from both divergence and swc-only flagging", (t) => {
  for (const heading of NON_DIFFABLE_HEADINGS) {
    const rsp = [section(heading, 2, "rsp text")];
    const swc = [section(heading, 2, "completely different swc text")];
    const { flags: divergedFlags } = mergeComponentSections(rsp, swc);
    t.deepEqual(divergedFlags, [], `${heading} should never be diff-flagged`);

    const swcOnly = [section(heading, 2, "swc-only text")];
    const { flags: swcOnlyFlags } = mergeComponentSections([], swcOnly);
    t.deepEqual(
      swcOnlyFlags,
      [],
      `${heading} should never be swc-only-flagged`,
    );
  }
});

// ── realistic multi-section page ─────────────────────────────────────────────

test("a realistic page mixes identical, divergent, RSP-only, and SWC-only sections correctly", (t) => {
  const rsp = [
    section("Anatomy", 2, "shared anatomy text"),
    section("Component options", 2, "rsp props: staticColor, quiet"),
    section("States", 2, "shared states text"),
    section("Usage guidelines", 2, "use links in body copy"),
    section("Content standards", 2, "rsp-only content guidance"),
  ];
  const swc = [
    section("Anatomy", 2, "shared anatomy text"),
    section("Component options", 2, "swc classes: swc-Link, swc-Link--quiet"),
    section("States", 2, "shared states text"),
    section("Usage guidelines", 2, "different swc wording entirely"),
    section("Behaviors", 2, "swc-only behavior notes"),
  ];

  const { sections, flags } = mergeComponentSections(rsp, swc);

  t.deepEqual(sections, rsp);
  t.deepEqual(flags, [
    {
      type: "diverged",
      heading: "Usage guidelines",
      level: 2,
      rspText: "use links in body copy",
      swcText: "different swc wording entirely",
    },
    {
      type: "swc-only-section",
      heading: "Behaviors",
      level: 2,
      swcText: "swc-only behavior notes",
    },
  ]);
});
