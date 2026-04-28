#!/usr/bin/env node
/**
 * S2 Documentation Scraper CLI
 * Usage:
 *   s2-scraper list                    List available components
 *   s2-scraper scrape <slug> <category> Scrape a single component
 *   s2-scraper scrape-all              Scrape all components
 */

/**
 * S2 Documentation Scraper CLI
 * Command-line interface for scraping S2 docs
 */

import { BrowserClient } from "./browser-client.js";
import {
  listComponents,
  scrapeComponent,
  scrapeAllComponents,
} from "./scraper.js";

const commands = {
  async list() {
    console.log("📋 Listing all S2 components...\n");

    const browser = new BrowserClient();
    try {
      await browser.connect();
      const components = await listComponents(browser);

      console.log("Components by category:\n");
      for (const [category, items] of Object.entries(components)) {
        console.log(`\n${category.toUpperCase()} (${items.length}):`);
        items.forEach((item) => {
          console.log(`  - ${item.name} (${item.slug})`);
        });
      }
    } finally {
      await browser.close();
    }
  },

  async scrape(componentSlug, category) {
    if (!componentSlug || !category) {
      console.error("Usage: s2-scraper scrape <component-slug> <category>");
      console.error("Example: s2-scraper scrape button actions");
      process.exit(1);
    }

    console.log(`📄 Scraping ${componentSlug} from ${category} category...\n`);

    const browser = new BrowserClient();
    try {
      await browser.connect();
      const url = `https://s2.spectrum.corp.adobe.com/page/${componentSlug}/`;
      const result = await scrapeComponent(
        browser,
        url,
        category,
        componentSlug,
      );

      if (result.success) {
        console.log(`\n✅ Successfully scraped ${componentSlug}`);
        console.log(`📁 Saved to: ${result.outputPath}`);
      } else {
        console.error(`\n❌ Failed to scrape ${componentSlug}`);
        process.exit(1);
      }
    } finally {
      await browser.close();
    }
  },

  async scrapeAll() {
    console.log("🚀 Starting full S2 documentation scrape...\n");
    console.log("This will take several minutes...\n");

    const browser = new BrowserClient();
    try {
      await browser.connect();
      const results = await scrapeAllComponents(browser);

      console.log("\n✅ Scraping complete!");
      console.log(
        `📊 ${results.success}/${results.total} components scraped successfully`,
      );
    } finally {
      await browser.close();
    }
  },

  help() {
    console.log(`
S2 Documentation Scraper

Usage:
  s2-scraper list                           List all available components
  s2-scraper scrape <slug> <category>       Scrape a single component
  s2-scraper scrape-all                     Scrape all components
  s2-scraper help                           Show this help message

Examples:
  s2-scraper list
  s2-scraper scrape button actions
  s2-scraper scrape text-field inputs
  s2-scraper scrape-all

Categories:
  actions, containers, feedback, inputs, navigation, status
    `);
  },
};

// Parse command line arguments
const [, , command, ...args] = process.argv;

if (
  !command ||
  command === "help" ||
  command === "--help" ||
  command === "-h"
) {
  commands.help();
} else if (commands[command]) {
  commands[command](...args).catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
} else {
  console.error(`Unknown command: ${command}`);
  commands.help();
  process.exit(1);
}
