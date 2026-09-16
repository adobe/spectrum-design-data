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

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parse } from "node-html-parser";

import {
  createClient,
  DEFAULT_SITE_ORIGIN,
  mapWithConcurrency,
} from "./aem-client.js";
import { inlineFragments } from "./fragments.js";
import { stripNoise, splitSections, isStubSections } from "./sections.js";
import { buildPageMap, SUPPORTED_PREFIXES } from "./hub-map.js";
import { renderPage } from "./markdown.js";

// Beta scope: only the prefixes hub-map.js can assign a guideline category to.
// Component pages (/web/rsp/components, /web/swc/components) are deliberately
// excluded — they flow through the separate `transform` command and are tracked
// as spectrum-design-data-085.2.2.
const DEFAULT_PREFIXES = [...SUPPORTED_PREFIXES];

function printUsage() {
  console.log(`
Usage:
  node src/cli.js [--out <dir>] [--origin <origin>] [--prefix <path>] [--limit <n>]
                  [--concurrency <n>] [--report <path>] [--dry-run]

Writes one markdown file per hub page to <out>/<category>/<slug>.md, in the
frontmatter + heading shape consumed by tools/s2-docs-to-document-blocks.

Defaults:
  --out ./_hub-fetch
  --origin ${DEFAULT_SITE_ORIGIN}
  --concurrency 6
  --prefix ${DEFAULT_PREFIXES.join(" --prefix ")}
`);
}

function parseArgs(argv) {
  const args = {
    outDir: "./_hub-fetch",
    origin: DEFAULT_SITE_ORIGIN,
    prefixes: [],
    limit: Number.POSITIVE_INFINITY,
    concurrency: 6,
    report: null,
    dryRun: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }

    if (arg === "--out" && argv[index + 1]) {
      args.outDir = argv[++index];
      continue;
    }

    if (arg === "--origin" && argv[index + 1]) {
      args.origin = argv[++index];
      continue;
    }

    if (arg === "--prefix" && argv[index + 1]) {
      args.prefixes.push(argv[++index]);
      continue;
    }

    if (arg === "--limit" && argv[index + 1]) {
      args.limit = Number(argv[++index]);
      continue;
    }

    if (arg === "--report" && argv[index + 1]) {
      args.report = argv[++index];
      continue;
    }

    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (arg === "--concurrency" && argv[index + 1]) {
      args.concurrency = Math.max(1, Number(argv[++index]) || 1);
      continue;
    }
  }

  // An explicit --prefix replaces the defaults rather than adding to them.
  if (args.prefixes.length === 0) {
    args.prefixes = [...DEFAULT_PREFIXES];
  }

  return args;
}

function toDateString(epochSeconds) {
  if (!Number.isFinite(epochSeconds)) {
    return null;
  }

  const value = new Date(epochSeconds * 1000);
  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value.toISOString().slice(0, 10);
}

function filterRows(rows, prefixes) {
  const normalized = prefixes.map((prefix) =>
    prefix.endsWith("/") ? prefix : `${prefix}/`,
  );

  return rows.filter((row) => {
    if (!row?.path) {
      return false;
    }

    return normalized.some(
      (prefix) =>
        row.path === prefix.slice(0, -1) || row.path.startsWith(prefix),
    );
  });
}

async function fetchPageSections({ row, client }) {
  const page = await client.fetchPage(row.path);
  if (!page?.html) {
    return {
      row,
      sections: [],
      isStub: true,
      fragments: null,
      title: row.title || "",
    };
  }

  const root = parse(page.html);
  const fragments = await inlineFragments(root, client.fetchPage, {
    warn: console.warn,
  });
  stripNoise(root);

  const sections = splitSections(root);
  const title =
    root.querySelector("h1")?.text.trim() ||
    row.title ||
    row.path.split("/").filter(Boolean).at(-1) ||
    "Untitled";

  return { row, sections, isStub: isStubSections(sections), fragments, title };
}

async function main() {
  const args = parseArgs(process.argv);

  const client = createClient({ siteOrigin: args.origin });
  const rows = filterRows(await client.fetchQueryIndex(), args.prefixes);
  const selectedRows = Number.isFinite(args.limit)
    ? rows.slice(0, args.limit)
    : rows;

  console.log(`Fetching ${selectedRows.length} page(s) from ${args.origin}...`);

  // Pass 1 — fetch and section-split every candidate page. Slug assignment in
  // pass 2 needs the whole retained set at once, so this cannot stream.
  const fetched = await mapWithConcurrency(
    selectedRows,
    args.concurrency,
    (row) => fetchPageSections({ row, client }),
  );

  // Pass 2 — drop stubs/non-canonical duplicates and assign unique slugs.
  const { mapped, dropped } = buildPageMap(
    fetched.map((page) => ({
      path: page.row.path,
      isStub: page.isStub,
      lastModified: page.row.lastModified,
      text: page.sections.map((section) => section.text).join(" "),
    })),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    origin: args.origin,
    prefixes: args.prefixes,
    totalRows: rows.length,
    selectedRows: selectedRows.length,
    written: 0,
    dropped,
    pages: [],
  };

  // Pass 3 — render and write the retained pages.
  for (const page of fetched) {
    const target = mapped.get(page.row.path);
    if (!target) {
      continue;
    }

    const { row } = page;
    const sourceUrl = `${args.origin}${row.path}`;
    const markdown = renderPage({
      title: page.title,
      category: target.category,
      sections: page.sections,
      sourceUrl,
      lastUpdated: toDateString(row.lastModified),
      tags: Array.isArray(row.tags) ? row.tags : [],
      extra: { hub_path: row.path },
    });

    const destination = join(args.outDir, target.category, `${target.slug}.md`);
    if (!args.dryRun) {
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, markdown, "utf8");
    }
    report.written += 1;

    report.pages.push({
      path: row.path,
      slug: target.slug,
      category: target.category,
      title: page.title,
      sourceUrl,
      outFile: destination,
      sectionCount: page.sections.length,
      fragmentsResolved: page.fragments?.resolved ?? 0,
      fragmentsFailed: page.fragments?.failed ?? 0,
    });
  }

  const reportPath = args.report
    ? args.report
    : join(process.cwd(), "hub-fetch-report.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const byReason = dropped.reduce((acc, entry) => {
    acc[entry.reason] = (acc[entry.reason] || 0) + 1;
    return acc;
  }, {});

  console.log(`Wrote ${report.written} page(s) into ${args.outDir}`);
  console.log(`Dropped ${dropped.length} page(s): ${JSON.stringify(byReason)}`);
  console.log(`Report written to ${reportPath}`);

  if (args.dryRun) {
    console.log("Dry run: no markdown files written.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
