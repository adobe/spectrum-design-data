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
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "node-html-parser";

import { main } from "../src/cli.js";

import { inlineFragments } from "../src/fragments.js";
import { stripNoise, splitSections } from "../src/sections.js";
import { renderPage } from "../src/markdown.js";
import { parseDoc } from "../../s2-docs-to-document-blocks/src/md-parser.js";

function loadFixture(pathname) {
  return readFileSync(new URL(pathname, import.meta.url), "utf8");
}

function createFixtureFetch() {
  return async function fetchFixture(path) {
    const resolved = new URL(`./fixtures${path}.plain.html`, import.meta.url);
    try {
      return { html: readFileSync(resolved, "utf8") };
    } catch {
      return null;
    }
  };
}

test("hub fetcher emits schema-compatible markdown from live-page HTML fixtures", async (t) => {
  const html = loadFixture(
    "./fixtures/web/swc/components/accordion.plain.html",
  );
  const root = parse(html);
  await inlineFragments(root, createFixtureFetch(), { warn: () => {} });
  stripNoise(root);

  const sections = splitSections(root);
  const markdown = renderPage({
    title: "Accordion",
    category: "fundamentals",
    sections,
    sourceUrl:
      "https://main--spectrum-hub--adobe.aem.live/web/swc/components/accordion",
    lastUpdated: "2024-01-02",
  });

  t.true(markdown.startsWith("---\n"));
  t.true(markdown.includes("title: Accordion"));
  t.true(markdown.includes("category: fundamentals"));
  t.true(
    markdown.includes(
      "source_url: https://main--spectrum-hub--adobe.aem.live/web/swc/components/accordion",
    ),
  );
  t.true(markdown.includes("last_updated: '2024-01-02'"));
  t.false(markdown.includes("related_components:"));
  t.true(markdown.includes("# Accordion"));
  t.true(markdown.includes("## Anatomy"));
  t.true(markdown.includes("## Component options"));
  t.true(markdown.includes("### Single vs. multiple expansion"));

  const parsed = parseDoc(markdown);
  t.is(parsed.title, "Accordion");
  t.deepEqual(
    parsed.sections.slice(0, 3).map((section) => section.heading),
    ["Anatomy", "Component options", "States"],
  );
});

test("hub fetcher writes a failure report when the query index is unreachable", async (t) => {
  const tempDir = mkdtempSync(join(tmpdir(), "spectrum-hub-fetcher-"));
  const reportPath = join(tempDir, "hub-fetch-report.json");
  const failure = new Error("connect ECONNREFUSED 127.0.0.1:1");

  try {
    await t.throwsAsync(
      main(
        [
          "node",
          "src/cli.js",
          "--origin",
          "http://127.0.0.1:1",
          "--report",
          reportPath,
        ],
        {
          clientFactory: () => ({
            fetchQueryIndex: async () => {
              throw failure;
            },
          }),
        },
      ),
      { is: failure },
    );

    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    t.is(report.origin, "http://127.0.0.1:1");
    t.is(report.totalRows, 0);
    t.is(report.selectedRows, 0);
    t.is(report.written, 0);
    t.deepEqual(report.dropped, []);
    t.deepEqual(report.pages, []);
    t.is(report.error, failure.message);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
