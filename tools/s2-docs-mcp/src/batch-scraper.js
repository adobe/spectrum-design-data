#!/usr/bin/env node

/**
 * S2 Documentation Batch Scraper
 * Scrapes all components from s2.spectrum.corp.adobe.com
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { execSync } from "child_process";

const BASE_URL = "https://s2.spectrum.corp.adobe.com";
const OUTPUT_DIR = join(
  homedir(),
  "Spectrum",
  "spectrum-design-data",
  "docs",
  "s2-docs",
);
const PARSER_SCRIPT = join(
  homedir(),
  ".cursor",
  "skills",
  "scrape-s2-docs",
  "scripts",
  "parse-s2-snapshot.mjs",
);

// Component list by category
const COMPONENTS = {
  actions: [
    "action-bar",
    "action-button",
    "action-group",
    "button",
    "button-group",
    "close-button",
    "link",
    "list-view",
    "menu",
  ],
  containers: ["dialog", "popover", "card", "divider", "tray"],
  feedback: ["alert", "progress-bar", "progress-circle", "toast", "meter"],
  inputs: [
    "checkbox",
    "checkbox-group",
    "color-area",
    "color-field",
    "color-slider",
    "color-swatch",
    "color-wheel",
    "combo-box",
    "number-field",
    "picker",
    "radio-group",
    "search-field",
    "slider",
    "switch",
    "text-area",
    "text-field",
  ],
  navigation: ["breadcrumbs", "pagination", "tabs", "tree-view"],
  status: ["badge", "tag", "status-light"],
};

/**
 * Instructions for manual browser scraping
 */
function printInstructions() {
  console.log("\n📋 S2 Documentation Batch Scraper\n");
  console.log(
    "This tool requires manual browser interaction via Cursor's browser MCP.\n",
  );
  console.log("Steps:\n");
  console.log(
    "1. Ensure you're connected to Adobe VPN or have certificate installed",
  );
  console.log("2. Open Cursor and use browser MCP to navigate to S2 docs");
  console.log(
    "3. For each component, take a snapshot and note the file path\n",
  );
  console.log("Component list:");

  let total = 0;
  Object.entries(COMPONENTS).forEach(([category, components]) => {
    console.log(`\n${category.toUpperCase()} (${components.length}):`);
    components.forEach((slug) => {
      console.log(`  - ${slug}: ${BASE_URL}/page/${slug}/`);
      total++;
    });
  });

  console.log(`\nTotal: ${total} components\n`);
  console.log(
    "Automated scraping not possible due to authentication requirements.",
  );
  console.log("Use Cursor's scrape-s2-docs skill to scrape components.\n");
}

/**
 * Parse a single snapshot file
 */
function parseSnapshot(snapshotPath, componentUrl, outputPath) {
  try {
    const command = `node "${PARSER_SCRIPT}" "${snapshotPath}" "${componentUrl}"`;
    const markdown = execSync(command, { encoding: "utf-8" });

    // Ensure output directory exists
    mkdirSync(dirname(outputPath), { recursive: true });

    // Write markdown file
    writeFileSync(outputPath, markdown, "utf-8");

    return true;
  } catch (error) {
    console.error(`Failed to parse ${snapshotPath}:`, error.message);
    return false;
  }
}

/**
 * Generate component index by scanning components directory (includes all scraped files)
 */
function generateIndex() {
  const indexPath = join(OUTPUT_DIR, "index.json");
  const index = {
    generated: new Date().toISOString(),
    categories: {},
  };

  const componentsDir = join(OUTPUT_DIR, "components");
  if (existsSync(componentsDir)) {
    const categories = readdirSync(componentsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    for (const category of categories) {
      const categoryPath = join(componentsDir, category);
      const files = readdirSync(categoryPath)
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.replace(/\.md$/, ""));
      index.categories[category] = files.map((slug) => ({
        slug,
        name: slug
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        url: `${BASE_URL}/page/${slug}/`,
        file: `components/${category}/${slug}.md`,
        exists: true,
      }));
    }
  }

  writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf-8");
  const total = Object.values(index.categories).reduce(
    (n, arr) => n + arr.length,
    0,
  );
  console.log(`\n✅ Generated index: ${indexPath} (${total} components)`);

  return index;
}

/**
 * Generate scraping status report
 */
function generateReport() {
  const index = generateIndex();

  let total = 0;
  let scraped = 0;
  let missing = [];

  Object.entries(index.categories).forEach(([category, components]) => {
    components.forEach((comp) => {
      total++;
      if (comp.exists) {
        scraped++;
      } else {
        missing.push(`${category}/${comp.slug}`);
      }
    });
  });

  console.log("\n📊 Scraping Status Report\n");
  console.log(`Total components: ${total}`);
  console.log(`Scraped: ${scraped} (${Math.round((scraped / total) * 100)}%)`);
  console.log(`Missing: ${total - scraped}\n`);

  if (missing.length > 0) {
    console.log("Missing components:");
    missing.forEach((comp) => console.log(`  - ${comp}`));
  }
}

// Main execution
const command = process.argv[2];

switch (command) {
  case "list":
    printInstructions();
    break;

  case "parse":
    if (process.argv.length < 5) {
      console.error(
        "Usage: s2-docs-mcp scrape parse <snapshot-file> <category> <slug>",
      );
      console.error(
        "Example: s2-docs-mcp scrape parse snapshot.log actions button",
      );
      process.exit(1);
    }
    const snapshotPath = process.argv[3];
    const category = process.argv[4];
    const slug = process.argv[5];
    const componentUrl = `${BASE_URL}/page/${slug}/`;
    const outputPath = join(OUTPUT_DIR, "components", category, `${slug}.md`);

    if (parseSnapshot(snapshotPath, componentUrl, outputPath)) {
      console.log(`✅ Parsed: ${outputPath}`);
    } else {
      process.exit(1);
    }
    break;

  case "index":
    generateIndex();
    break;

  case "report":
    generateReport();
    break;

  default:
    console.log("S2 Documentation Batch Scraper\n");
    console.log("Commands:");
    console.log("  list      - List all components to scrape");
    console.log("  parse     - Parse a snapshot file");
    console.log("  index     - Generate component index");
    console.log("  report    - Generate scraping status report");
    console.log("\nExamples:");
    console.log("  npm run scrape list");
    console.log("  npm run scrape parse snapshot.log actions button");
    console.log("  npm run scrape report");
}
