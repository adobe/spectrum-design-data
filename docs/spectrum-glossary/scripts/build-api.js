#!/usr/bin/env node

/**
 * Build Static JSON API
 * Generates JSON files for all terms, categories, and platforms
 */

import * as registry from "@adobe/design-system-registry";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const API_DIR = join(__dirname, "..", "dist", "api", "v1");

// Ensure API directory exists
async function ensureDir(dir) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
}

// Get all terms from all registries
function getAllTerms() {
  const allTerms = [];
  const registryTypes = [
    "sizes",
    "states",
    "variants",
    "anatomyTerms",
    "components",
    "scaleValues",
    "categories",
    "platforms",
    "navigationTerms",
    "tokenTerminology",
    "glossary",
  ];

  registryTypes.forEach((type) => {
    const data = registry[type];
    if (data && data.values) {
      data.values.forEach((term) => {
        allTerms.push({
          ...term,
          registryType: type,
          registryLabel: data.label || type,
        });
      });
    }
  });

  return allTerms;
}

// Generate main glossary file
async function generateGlossary(allTerms) {
  const glossaryPath = join(API_DIR, "glossary.json");
  await writeFile(glossaryPath, JSON.stringify(allTerms, null, 2));
  console.log(`✓ Generated glossary.json (${allTerms.length} terms)`);
}

// Generate individual term files
async function generateTermFiles(allTerms) {
  const termsDir = join(API_DIR, "terms");
  await ensureDir(termsDir);

  for (const term of allTerms) {
    const termPath = join(termsDir, `${term.id}.json`);
    await writeFile(termPath, JSON.stringify(term, null, 2));
  }

  console.log(`✓ Generated ${allTerms.length} term files`);
}

// Generate category files
async function generateCategoryFiles() {
  const categoriesDir = join(API_DIR, "categories");
  await ensureDir(categoriesDir);

  const registryTypes = {
    sizes: registry.sizes,
    states: registry.states,
    variants: registry.variants,
    anatomyTerms: registry.anatomyTerms,
    components: registry.components,
    scaleValues: registry.scaleValues,
    categories: registry.categories,
    platforms: registry.platforms,
    navigationTerms: registry.navigationTerms,
    tokenTerminology: registry.tokenTerminology,
    glossary: registry.glossary,
  };

  let count = 0;
  for (const [id, data] of Object.entries(registryTypes)) {
    const categoryData = {
      id,
      label: data.label || id,
      description: data.description || "",
      terms: data.values || [],
    };

    const categoryPath = join(categoriesDir, `${id}.json`);
    await writeFile(categoryPath, JSON.stringify(categoryData, null, 2));
    count++;
  }

  console.log(`✓ Generated ${count} category files`);
}

// Generate platform files
async function generatePlatformFiles(allTerms) {
  const platformsDir = join(API_DIR, "platforms");
  await ensureDir(platformsDir);

  // Group terms by platform
  const platformTerms = {};

  allTerms.forEach((term) => {
    if (term.platforms) {
      Object.keys(term.platforms).forEach((platformKey) => {
        if (!platformTerms[platformKey]) {
          platformTerms[platformKey] = [];
        }
        platformTerms[platformKey].push({
          ...term,
          platformData: term.platforms[platformKey],
        });
      });
    }
  });

  let count = 0;
  for (const [platformKey, terms] of Object.entries(platformTerms)) {
    const platformPath = join(platformsDir, `${platformKey}.json`);
    await writeFile(platformPath, JSON.stringify(terms, null, 2));
    count++;
  }

  console.log(`✓ Generated ${count} platform files`);
}

// Generate stats file
async function generateStats(allTerms) {
  const enhancedTerms = allTerms.filter((t) => t.definition);
  const platformCount = new Set();

  allTerms.forEach((term) => {
    if (term.platforms) {
      Object.keys(term.platforms).forEach((p) => platformCount.add(p));
    }
  });

  const stats = {
    totalTerms: allTerms.length,
    enhancedTerms: enhancedTerms.length,
    registries: 11,
    platforms: platformCount.size,
    lastUpdated: new Date().toISOString(),
    byRegistry: {},
  };

  // Count by registry
  const registryTypes = [
    "sizes",
    "states",
    "variants",
    "anatomyTerms",
    "components",
    "scaleValues",
    "categories",
    "platforms",
    "navigationTerms",
    "tokenTerminology",
    "glossary",
  ];

  registryTypes.forEach((type) => {
    const data = registry[type];
    if (data && data.values) {
      stats.byRegistry[type] = {
        label: data.label || type,
        count: data.values.length,
      };
    }
  });

  const statsPath = join(API_DIR, "stats.json");
  await writeFile(statsPath, JSON.stringify(stats, null, 2));
  console.log("✓ Generated stats.json");
}

// Main build function
async function build() {
  console.log("Building static JSON API...\n");

  try {
    // Ensure API directory exists
    await ensureDir(API_DIR);

    // Get all terms
    const allTerms = getAllTerms();

    // Generate all API files
    await generateGlossary(allTerms);
    await generateTermFiles(allTerms);
    await generateCategoryFiles();
    await generatePlatformFiles(allTerms);
    await generateStats(allTerms);

    console.log("\n✅ API build complete!");
  } catch (error) {
    console.error("❌ API build failed:", error);
    process.exit(1);
  }
}

// Run build
build();
