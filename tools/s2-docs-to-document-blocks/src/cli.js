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

import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { transformComponent } from "./transformer.js";
import { buildGuideline } from "./guideline-builder.js";
import { writeJson } from "./write-json.js";
import { readFileSync } from "node:fs";
import { parseDoc } from "./md-parser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve monorepo root relative to this file: tools/s2-docs-to-document-blocks/src/cli.js → ../../..
const ROOT = resolve(__dirname, "../../..");
const DOCS_DIR = join(ROOT, "docs/s2-docs/components");
const COMPONENTS_DIR = join(ROOT, "packages/design-data/components");

const GUIDELINE_SUBTREES = [
  "designing",
  "fundamentals",
  "developing",
  "support",
];
const GUIDELINES_OUT_DIR = join(ROOT, "packages/design-data/guidelines");

/** Map component slug → absolute path to s2-docs Markdown file */
function buildDocIndex() {
  const index = new Map();
  for (const category of readdirSync(DOCS_DIR)) {
    const catDir = join(DOCS_DIR, category);
    for (const file of readdirSync(catDir)) {
      if (!file.endsWith(".md")) continue;
      const slug = file.replace(".md", "");
      index.set(slug, join(catDir, file));
    }
  }
  return index;
}

/** Map slug → absolute path to design-data component JSON */
function buildComponentIndex() {
  const index = new Map();
  for (const file of readdirSync(COMPONENTS_DIR)) {
    if (!file.endsWith(".json")) continue;
    const slug = file.replace(".json", "");
    index.set(slug, join(COMPONENTS_DIR, file));
  }
  return index;
}

/** Map guideline slug → absolute path to s2-docs Markdown file (across all subtrees) */
function buildGuidelineIndex() {
  const index = new Map();
  const s2DocsBase = join(ROOT, "docs/s2-docs");
  for (const subtree of GUIDELINE_SUBTREES) {
    const subtreeDir = join(s2DocsBase, subtree);
    if (!existsSync(subtreeDir)) continue;
    for (const file of readdirSync(subtreeDir)) {
      if (!file.endsWith(".md")) continue;
      const slug = file.replace(".md", "");
      index.set(slug, join(subtreeDir, file));
    }
  }
  return index;
}

function printUsage() {
  console.log(`
s2-docs-to-document-blocks — inject documentBlocks into design-data JSON files

Usage:
  node src/cli.js transform [options]
  node src/cli.js guideline [options]

Commands:
  transform   Inject documentBlocks into component JSON files
  guideline   Generate guidelines/*.json from s2-docs foundation pages

transform options:
  --component <slug>    Transform a single component (e.g. --component button)
  --dry-run             Parse and build blocks but do not write JSON; always writes review report
  --report <path>       Write review report to this file (default: document-blocks-review.md in cwd)
  --help                Show this help

guideline options:
  --page <slug>         Generate a single guideline page (e.g. --page colors)
  --dry-run             Parse and build but do not write JSON; always writes review report
  --report <path>       Write review report to this file (default: guideline-review.md in cwd)
  --help                Show this help

Examples:
  node src/cli.js transform --component button --dry-run
  node src/cli.js transform
  node src/cli.js guideline --page colors --dry-run
  node src/cli.js guideline
`);
}

function parseArgs(argv) {
  const args = {
    command: null,
    component: null,
    page: null,
    dryRun: false,
    report: null,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "transform") {
      args.command = "transform";
      continue;
    }
    if (argv[i] === "guideline") {
      args.command = "guideline";
      continue;
    }
    if (argv[i] === "--help" || argv[i] === "-h") {
      printUsage();
      process.exit(0);
    }
    if (argv[i] === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (argv[i] === "--component" && argv[i + 1]) {
      args.component = argv[++i];
      continue;
    }
    if (argv[i] === "--page" && argv[i + 1]) {
      args.page = argv[++i];
      continue;
    }
    if (argv[i] === "--report" && argv[i + 1]) {
      args.report = argv[++i];
      continue;
    }
  }
  return args;
}

function buildReviewReport(results) {
  const lines = [
    "# s2-docs → documentBlocks review report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `| Stat | Count |`,
    `| --- | --- |`,
    `| Components processed | ${results.length} |`,
    `| Changed (blocks written) | ${results.filter((r) => r.changed).length} |`,
    `| Unchanged / stub | ${results.filter((r) => !r.changed).length} |`,
    `| Components with flags | ${results.filter((r) => r.flags.length > 0).length} |`,
    "",
    "## Flags by component",
    "",
  ];

  const flagged = results.filter((r) => r.flags.length > 0);
  if (flagged.length === 0) {
    lines.push("_No flags — all components processed cleanly._");
  } else {
    for (const r of flagged) {
      lines.push(`### ${r.slug}`);
      lines.push("");
      for (const flag of r.flags) {
        lines.push(`- ${flag}`);
      }
      lines.push("");
    }
  }

  lines.push("## Unchanged / stub components", "");
  const unchanged = results.filter((r) => !r.changed);
  if (unchanged.length === 0) {
    lines.push("_All components received at least one block._");
  } else {
    for (const r of unchanged) {
      lines.push(`- \`${r.slug}\`${r.flags.length ? ": " + r.flags[0] : ""}`);
    }
    lines.push("");
  }

  lines.push("## Block counts", "");
  const sorted = [...results]
    .filter((r) => r.changed)
    .sort((a, b) => b.blocks.length - a.blocks.length);
  lines.push("| Component | Blocks |");
  lines.push("| --- | --- |");
  for (const r of sorted) {
    lines.push(`| ${r.slug} | ${r.blocks.length} |`);
  }
  lines.push("");

  return lines.join("\n");
}

function buildGuidelineReport(results) {
  const lines = [
    "# s2-docs → guidelines review report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `| Stat | Count |`,
    `| --- | --- |`,
    `| Pages processed | ${results.length} |`,
    `| Written | ${results.filter((r) => r.written).length} |`,
    `| Stubs / skipped | ${results.filter((r) => !r.written).length} |`,
    `| Pages with flags | ${results.filter((r) => r.flags.length > 0).length} |`,
    "",
    "## Flags by page",
    "",
  ];

  const flagged = results.filter((r) => r.flags.length > 0);
  if (flagged.length === 0) {
    lines.push("_No flags — all pages processed cleanly._");
  } else {
    for (const r of flagged) {
      lines.push(`### ${r.slug}`);
      lines.push("");
      for (const flag of r.flags) {
        lines.push(`- ${flag}`);
      }
      lines.push("");
    }
  }

  lines.push("## Stubs / skipped pages", "");
  const stubs = results.filter((r) => !r.written);
  if (stubs.length === 0) {
    lines.push("_All pages produced at least one block._");
  } else {
    for (const r of stubs) {
      lines.push(`- \`${r.slug}\`${r.flags.length ? ": " + r.flags[0] : ""}`);
    }
    lines.push("");
  }

  lines.push("## Block counts", "");
  const sorted = [...results]
    .filter((r) => r.written)
    .sort((a, b) => b.blocks.length - a.blocks.length);
  lines.push("| Page | Category | Blocks |");
  lines.push("| --- | --- | --- |");
  for (const r of sorted) {
    lines.push(`| ${r.slug} | ${r.category ?? ""} | ${r.blocks.length} |`);
  }
  lines.push("");

  return lines.join("\n");
}

async function runTransform(args) {
  const docIndex = buildDocIndex();
  const componentIndex = buildComponentIndex();

  let slugs;
  if (args.component) {
    if (!docIndex.has(args.component)) {
      console.error(
        `Error: no s2-docs file found for component "${args.component}"`,
      );
      console.error(
        `Available slugs: ${[...docIndex.keys()].sort().join(", ")}`,
      );
      process.exit(1);
    }
    slugs = [args.component];
  } else {
    slugs = [...docIndex.keys()]
      .filter((slug) => componentIndex.has(slug))
      .sort();
  }

  console.log(
    `Processing ${slugs.length} component(s)${args.dryRun ? " [DRY RUN]" : ""}...`,
  );

  const results = [];
  let written = 0;
  let skipped = 0;

  for (const slug of slugs) {
    const docPath = docIndex.get(slug);
    const jsonPath = componentIndex.get(slug);

    if (!existsSync(jsonPath)) {
      results.push({
        slug,
        changed: false,
        blocks: [],
        flags: [`No component JSON at ${jsonPath}`],
      });
      skipped++;
      continue;
    }

    const result = await transformComponent(jsonPath, docPath, {
      dryRun: args.dryRun,
    });
    result.slug = slug;
    results.push(result);

    if (result.changed) {
      written++;
      const flagNote = result.flags.length
        ? ` (${result.flags.length} flag(s))`
        : "";
      console.log(`  ✓ ${slug} — ${result.blocks.length} block(s)${flagNote}`);
    } else {
      skipped++;
      console.log(`  ○ ${slug} — no blocks (${result.flags[0] ?? "empty"})`);
    }
  }

  const reportPath =
    args.report ?? join(process.cwd(), "document-blocks-review.md");
  const report = buildReviewReport(results);
  writeFileSync(reportPath, report, "utf8");

  console.log(`\nDone. ${written} file(s) updated, ${skipped} skipped.`);
  console.log(`Review report written to: ${reportPath}`);
  if (args.dryRun) {
    console.log("(dry-run mode: no JSON files were modified)");
  }
}

async function runGuideline(args) {
  const guidelineIndex = buildGuidelineIndex();
  const componentIndex = buildComponentIndex();

  // Build resolution sets for kind inference in buildGuideline.
  const componentNames = new Set(componentIndex.keys());
  const guidelineSlugs = new Set(guidelineIndex.keys());

  let slugs;
  if (args.page) {
    if (!guidelineIndex.has(args.page)) {
      console.error(`Error: no s2-docs file found for page "${args.page}"`);
      console.error(
        `Available slugs: ${[...guidelineIndex.keys()].sort().join(", ")}`,
      );
      process.exit(1);
    }
    slugs = [args.page];
  } else {
    slugs = [...guidelineIndex.keys()].sort();
  }

  console.log(
    `Processing ${slugs.length} guideline page(s)${args.dryRun ? " [DRY RUN]" : ""}...`,
  );

  if (!args.dryRun) {
    mkdirSync(GUIDELINES_OUT_DIR, { recursive: true });
  }

  const results = [];
  const manifestEntries = [];
  let written = 0;
  let skipped = 0;

  for (const slug of slugs) {
    const mdPath = guidelineIndex.get(slug);
    const markdown = readFileSync(mdPath, "utf8");
    const parsedDoc = parseDoc(markdown);

    const { doc, blocks, flags, isStub } = buildGuideline(parsedDoc, slug, {
      componentNames,
      guidelineSlugs,
    });

    const result = {
      slug,
      written: false,
      blocks,
      flags,
      category: parsedDoc.frontmatter?.category,
    };
    results.push(result);

    if (isStub || !doc) {
      skipped++;
      console.log(`  ○ ${slug} — stub/empty (${flags[0] ?? "no blocks"})`);
      continue;
    }

    result.written = true;
    written++;
    const flagNote = flags.length ? ` (${flags.length} flag(s))` : "";
    console.log(`  ✓ ${slug} — ${blocks.length} block(s)${flagNote}`);

    const outPath = join(GUIDELINES_OUT_DIR, `${slug}.json`);
    if (!args.dryRun) {
      await writeJson(outPath, doc);
    }

    manifestEntries.push({
      slug,
      title: doc.title,
      category: doc.category,
      status: doc.status ?? null,
      sourceUrl: doc.sourceUrl ?? null,
      file: `guidelines/${slug}.json`,
    });
  }

  // Write manifest (catalog for MCP discovery)
  if (!args.dryRun && manifestEntries.length > 0) {
    const manifest = {
      generated: new Date().toISOString(),
      guidelines: manifestEntries,
    };
    const manifestPath = join(GUIDELINES_OUT_DIR, "manifest.json");
    await writeJson(manifestPath, manifest);
    console.log(`\nManifest written: ${manifestPath}`);
  }

  const reportPath = args.report ?? join(process.cwd(), "guideline-review.md");
  const report = buildGuidelineReport(results);
  writeFileSync(reportPath, report, "utf8");

  console.log(`Done. ${written} file(s) written, ${skipped} skipped.`);
  console.log(`Review report written to: ${reportPath}`);
  if (args.dryRun) {
    console.log("(dry-run mode: no JSON files were written)");
  }
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.command) {
    printUsage();
    process.exit(1);
  }

  if (args.command === "transform") {
    await runTransform(args);
  } else if (args.command === "guideline") {
    await runGuideline(args);
  } else {
    printUsage();
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
