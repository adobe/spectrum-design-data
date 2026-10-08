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
import { fileURLToPath } from "node:url";
import { buildGuidelineIndex } from "../../s2-docs-to-document-blocks/src/cli.js";
import { parse } from "node-html-parser";

import { main } from "../src/cli.js";
import { createClient } from "../src/aem-client.js";

import { inlineFragments } from "../src/fragments.js";
import { stripNoise, splitSections } from "../src/sections.js";
import { renderPage } from "../src/markdown.js";
import { parseDoc } from "../../s2-docs-to-document-blocks/src/md-parser.js";
import { buildGuideline } from "../../s2-docs-to-document-blocks/src/guideline-builder.js";

function loadFixture(pathname) {
  return readFileSync(new URL(pathname, import.meta.url), "utf8");
}

test("text boundaries and decoded punctuation survive extraction and guideline publication", (t) => {
  const root = parse(loadFixture("./fixtures/text-boundaries.plain.html"));
  stripNoise(root);
  const sections = splitSections(root);
  const text = sections.map((section) => section.text).join(" ");
  t.true(text.includes("Up to 10 300%"));
  t.true(text.includes("First paragraph. Second paragraph."));
  t.true(text.includes("paragraphs Image:"));
  t.true(text.includes('Use "quoted" text & punctuation <like this>.'));
  t.true(text.includes("Don't break inline words."));
  t.false(text.includes("&quot;"));
  t.false(text.includes("10300%"));
  t.false(text.includes("Hidden internal guidance"));
  const markdown = renderPage({
    title: "Text boundaries",
    category: "designing",
    sourceUrl: "https://spectrum.adobe.com/guides/text-boundaries",
    sections,
  });
  const { doc } = buildGuideline(parseDoc(markdown), "text-boundaries");
  const published = JSON.stringify(doc.documentBlocks);
  t.true(published.includes("Up to 10 300%"));
  t.true(published.includes("First paragraph. Second paragraph."));
  t.false(published.includes("&quot;"));
  t.false(published.includes("paragraphsImage:"));
});

test("published internationalization and grammar guidance retains readable text", (t) => {
  for (const slug of ["internationalization", "grammar-and-mechanics"]) {
    const markdown = readFileSync(
      buildGuidelineIndex(
        fileURLToPath(new URL("../../../docs/s2-docs", import.meta.url)),
      ).get(slug),
      "utf8",
    );
    const json = readFileSync(
      new URL(
        `../../../packages/design-data/guidelines/${slug}.json`,
        import.meta.url,
      ),
      "utf8",
    );
    for (const text of [markdown, json]) {
      t.false(text.includes("&quot;"), slug);
      if (slug === "internationalization") {
        t.true(text.includes("Up to 10 300%"));
        t.true(text.includes("paragraphs Image:"));
        t.false(text.includes("10300%"));
        t.false(text.includes("paragraphsImage:"));
      }
    }
  }
});

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

test("hub client fetches the public Spectrum site by default", async (t) => {
  const urls = [];
  const client = createClient({
    fetchImpl: async (url) => {
      urls.push(url);
      return {
        ok: true,
        headers: new Headers(),
        json: async () => ({ data: [] }),
        text: async () => "<h1>Motion</h1>",
      };
    },
  });

  await client.fetchQueryIndex();
  await client.fetchPage("/foundations/behavior/motion");

  t.deepEqual(urls, [
    "https://spectrum.adobe.com/query-index.json?limit=500",
    "https://spectrum.adobe.com/foundations/behavior/motion.plain.html",
  ]);
});

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

test("hub fetcher preserves image alt text and source context", (t) => {
  const root = parse(`
    <main>
      <h1>Image guidance</h1>
      <h2>Visual example</h2>
      <figure>
        <img src="../assets/example.png" alt="Example component anatomy" />
        <figcaption>Annotated anatomy example</figcaption>
      </figure>
      <picture>
        <source srcset="wide.png 2x, fallback.png" />
        <img src="fallback.png" alt="Responsive example" />
      </picture>
      <img src="https://cdn.example.com/unlabeled.png" />
    </main>
  `);

  stripNoise(root, {
    baseUrl: "https://main--spectrum-hub--adobe.aem.live/guides/page",
  });

  const sections = splitSections(root);
  const markdown = renderPage({
    title: "Image guidance",
    category: "guidelines",
    sections,
    sourceUrl: "https://main--spectrum-hub--adobe.aem.live/guides/page",
    lastUpdated: "2026-09-23",
  });
  const text = sections.map((section) => section.text).join(" ");
  t.true(markdown.includes("Image: Example component anatomy"));
  t.true(
    markdown.includes(
      "source: https://main--spectrum-hub--adobe.aem.live/assets/example.png",
    ),
  );
  t.true(text.includes("Image: Example component anatomy"));
  t.true(text.includes("Annotated anatomy example"));
  t.true(
    text.includes(
      "source: https://main--spectrum-hub--adobe.aem.live/assets/example.png",
    ),
  );
  t.true(text.includes("Image: Responsive example"));
  t.true(
    text.includes(
      "source: https://main--spectrum-hub--adobe.aem.live/guides/fallback.png",
    ),
  );
  t.true(text.includes("Image: Unlabeled image"));
  t.true(text.includes("source: https://cdn.example.com/unlabeled.png"));
});
