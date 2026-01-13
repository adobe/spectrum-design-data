#!/usr/bin/env node

/**
 * Build Search Index
 * Generates optimized search index for Fuse.js
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

// Build search index with optimized data
function buildSearchIndex(allTerms) {
  return allTerms.map((term) => {
    // Extract platform-specific terms for search
    const platformTerms = [];
    if (term.platforms) {
      Object.entries(term.platforms).forEach(([platform, data]) => {
        if (data.term) {
          platformTerms.push(`${platform}: ${data.term}`);
        }
      });
    }

    return {
      id: term.id,
      label: term.label || term.id,
      description: term.description || "",
      definition: term.definition
        ? {
            superordinate: term.definition.superordinate || "",
            description: term.definition.description || "",
          }
        : null,
      aliases: term.aliases || [],
      registryType: term.registryType,
      registryLabel: term.registryLabel,
      platformTerms: platformTerms,
      usedIn: term.usedIn || [],
      // Include searchable text for better matching
      searchText: [
        term.id,
        term.label || term.id,
        term.description || "",
        term.definition?.description || "",
        term.definition?.superordinate || "",
        ...(term.aliases || []),
        ...platformTerms,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    };
  });
}

// Main build function
async function build() {
  console.log("Building search index...\n");

  try {
    // Ensure API directory exists
    await ensureDir(API_DIR);

    // Get all terms
    const allTerms = getAllTerms();
    console.log(`Processing ${allTerms.length} terms...`);

    // Build search index
    const searchIndex = buildSearchIndex(allTerms);

    // Write search index
    const indexPath = join(API_DIR, "search-index.json");
    await writeFile(indexPath, JSON.stringify(searchIndex, null, 2));

    console.log(
      `✓ Generated search-index.json (${searchIndex.length} entries)`,
    );
    console.log("\n✅ Search index build complete!");
  } catch (error) {
    console.error("❌ Search index build failed:", error);
    process.exit(1);
  }
}

// Run build
build();
