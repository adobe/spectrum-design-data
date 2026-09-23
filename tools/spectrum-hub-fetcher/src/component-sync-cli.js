#!/usr/bin/env node
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

/**
 * CLI entrypoint for `component-sync.js`, for bead spectrum-design-data-085.2.5's
 * `hub-component-sync.yml` (Phase C). Fetches every Hub slug component-map.js
 * knows about, merges each RSP/SWC pair, and writes one Markdown file per
 * resolved local target under <out>/<category>/<target>.md — in the same
 * frontmatter + heading shape tools/s2-docs-to-document-blocks already
 * consumes via its `transform` command.
 *
 * All the actual fetch/merge/render logic lives in `component-sync.js`,
 * which has no CLI/argv/process.exit concerns and is what tests import —
 * mirrors the existing split between `cli.js` and
 * `component-fetch.js`/`component-merge.js`.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  createClient,
  DEFAULT_SITE_ORIGIN,
  mapWithConcurrency,
} from "./aem-client.js";
import { listKnownHubSlugs, syncSlug } from "./component-sync.js";

function printUsage() {
  console.log(`
Usage:
  node src/component-sync-cli.js [--out <dir>] [--origin <origin>] [--limit <n>]
                                  [--concurrency <n>] [--report <path>] [--dry-run]
                                  [--components-dir <dir>]

Fetches every Hub slug component-map.js knows about (RSP + SWC where both
exist), merges each pair with mergeComponentSections(), and writes one
Markdown file per resolved local target under <out>/<category>/<target>.md —
in the same frontmatter + heading shape tools/s2-docs-to-document-blocks
already consumes via its \`transform\` command.

Defaults:
  --out ./_hub-component-fetch
  --origin ${DEFAULT_SITE_ORIGIN}
  --concurrency 6
  --report ./hub-component-fetch-report.json
  --components-dir packages/design-data/components (relative to cwd)
`);
}

function parseArgs(argv) {
  const args = {
    outDir: "./_hub-component-fetch",
    origin: DEFAULT_SITE_ORIGIN,
    limit: Number.POSITIVE_INFINITY,
    concurrency: 6,
    report: null,
    dryRun: false,
    componentsDir: "packages/design-data/components",
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
    if (arg === "--limit" && argv[index + 1]) {
      args.limit = Number(argv[++index]);
      continue;
    }
    if (arg === "--concurrency" && argv[index + 1]) {
      args.concurrency = Math.max(1, Number(argv[++index]) || 1);
      continue;
    }
    if (arg === "--report" && argv[index + 1]) {
      args.report = argv[++index];
      continue;
    }
    if (arg === "--components-dir" && argv[index + 1]) {
      args.componentsDir = argv[++index];
      continue;
    }
    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const client = createClient({ siteOrigin: args.origin });

  const allSlugs = listKnownHubSlugs();
  const selectedSlugs = Number.isFinite(args.limit)
    ? allSlugs.slice(0, args.limit)
    : allSlugs;

  console.log(
    `Syncing ${selectedSlugs.length} of ${allSlugs.length} known component slug(s) from ${args.origin}...`,
  );

  const results = await mapWithConcurrency(
    selectedSlugs,
    args.concurrency,
    (slug) =>
      syncSlug({
        client,
        slug,
        componentsDir: args.componentsDir,
        siteOrigin: args.origin,
      }),
  );

  let written = 0;
  const pages = [];
  const unavailable = [];
  const unrecognized = [];
  const allFlags = [];

  for (const result of results) {
    if (result.status === "unavailable") {
      unavailable.push(result.slug);
      continue;
    }
    if (result.status === "unrecognized") {
      unrecognized.push(result.slug);
      for (const flag of result.flags) {
        allFlags.push({ slug: result.slug, ...flag });
      }
      continue;
    }

    for (const { target, category } of result.targets) {
      const destination = join(args.outDir, category, `${target}.md`);
      if (!args.dryRun) {
        mkdirSync(dirname(destination), { recursive: true });
        writeFileSync(destination, result.markdown, "utf8");
      }
      written += 1;
    }

    for (const flag of result.flags) {
      allFlags.push({ slug: result.slug, ...flag });
    }

    pages.push({
      slug: result.slug,
      targets: result.targets.map((t) => t.target),
      fragmentsResolved: result.fragmentsResolved,
      fragmentsFailed: result.fragmentsFailed,
      flagCount: result.flags.length,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    origin: args.origin,
    totalSlugs: allSlugs.length,
    selectedSlugs: selectedSlugs.length,
    written,
    unavailable,
    unrecognized,
    pages,
    flags: allFlags,
  };

  const reportPath =
    args.report ?? join(process.cwd(), "hub-component-fetch-report.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Wrote ${written} Markdown file(s) into ${args.outDir}`);
  if (unavailable.length > 0) {
    console.log(
      `Unavailable (expected but missing on Hub): ${unavailable.join(", ")}`,
    );
  }
  if (unrecognized.length > 0) {
    console.log(
      `Unrecognized (not in component-map.js): ${unrecognized.join(", ")}`,
    );
  }
  console.log(`${allFlags.length} merge flag(s) surfaced for review.`);
  console.log(`Report written to ${reportPath}`);

  if (args.dryRun) {
    console.log("Dry run: no Markdown files written.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
