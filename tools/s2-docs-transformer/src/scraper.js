/**
 * S2 Documentation Scraper
 * Main scraping logic
 */

import { promises as fs } from "fs";
import path from "path";
import {
  parseComponentPage,
  extractComponentList,
  componentToMarkdown,
} from "./parser.js";

const BASE_URL = "https://s2.spectrum.corp.adobe.com";
const OUTPUT_DIR = path.join(
  process.env.HOME,
  "Spectrum",
  "spectrum-design-data",
  "docs",
  "s2-docs",
);

/**
 * Get list of all components from S2 site
 */
export async function listComponents(browserClient) {
  console.log("Fetching component list from S2 docs...");

  // Navigate to home page
  await browserClient.navigate(BASE_URL);

  // Expand Components menu
  const snapshot1 = await browserClient.snapshot();
  const componentsLinkMatch = snapshot1.content[0].text.match(
    /link "Components" \[ref=([^\]]+)\]/,
  );

  if (componentsLinkMatch) {
    await browserClient.click(
      "Components navigation link",
      componentsLinkMatch[1],
    );
  }

  // Get updated snapshot with expanded menu
  const snapshot2 = await browserClient.snapshot();
  const components = extractComponentList(snapshot2.content[0].text);

  return components;
}

/**
 * Scrape a single component page
 */
export async function scrapeComponent(
  browserClient,
  componentUrl,
  category,
  slug,
) {
  console.log(`Scraping: ${componentUrl}`);

  try {
    // Navigate to component page
    const navResult = await browserClient.navigate(componentUrl);

    // Wait a moment for page to load
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get page snapshot
    const snapshot = await browserClient.snapshot();

    // Parse the page
    const componentData = parseComponentPage(
      snapshot.content[0].text,
      componentUrl,
    );

    // Convert to markdown
    const markdown = componentToMarkdown(
      componentData,
      snapshot.content[0].text,
    );

    // Save to file
    const outputPath = path.join(
      OUTPUT_DIR,
      "components",
      category,
      `${slug}.md`,
    );
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, markdown, "utf-8");

    console.log(`✅ Saved: ${outputPath}`);

    return {
      success: true,
      component: componentData,
      outputPath,
    };
  } catch (error) {
    console.error(`❌ Failed to scrape ${componentUrl}:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Scrape all components
 */
export async function scrapeAllComponents(browserClient) {
  console.log("Starting full documentation scrape...");

  // Get component list
  const components = await listComponents(browserClient);

  const results = {
    total: 0,
    success: 0,
    failed: 0,
    components: [],
  };

  // Scrape each category
  for (const [category, items] of Object.entries(components)) {
    console.log(
      `\n📁 Scraping ${category} category (${items.length} components)...`,
    );

    for (const component of items) {
      results.total++;

      const result = await scrapeComponent(
        browserClient,
        component.url,
        category,
        component.slug,
      );

      if (result.success) {
        results.success++;
      } else {
        results.failed++;
      }

      results.components.push({
        ...component,
        category,
        ...result,
      });

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Save summary
  const summaryPath = path.join(OUTPUT_DIR, "scrape-summary.json");
  await fs.writeFile(summaryPath, JSON.stringify(results, null, 2), "utf-8");

  console.log("\n" + "=".repeat(50));
  console.log("📊 Scraping Complete!");
  console.log(`Total: ${results.total}`);
  console.log(`Success: ${results.success}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Summary saved to: ${summaryPath}`);

  return results;
}
