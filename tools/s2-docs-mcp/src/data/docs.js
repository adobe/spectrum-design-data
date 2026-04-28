/**
 * S2 Documentation Data Access
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const DOCS_DIR = join(
  homedir(),
  "Spectrum",
  "spectrum-design-data",
  "docs",
  "s2-docs",
);

/**
 * Load component index
 */
export function loadIndex() {
  const indexPath = join(DOCS_DIR, "index.json");
  if (!existsSync(indexPath)) {
    return { categories: {} };
  }
  return JSON.parse(readFileSync(indexPath, "utf-8"));
}

/**
 * Get list of all components
 */
export function getAllComponents() {
  const index = loadIndex();
  const components = [];

  Object.entries(index.categories || {}).forEach(([category, items]) => {
    items.forEach((comp) => {
      if (comp.exists) {
        components.push({
          ...comp,
          category,
        });
      }
    });
  });

  return components;
}

/**
 * Get components by category
 */
export function getComponentsByCategory(category) {
  const index = loadIndex();
  return (index.categories[category] || []).filter((comp) => comp.exists);
}

/**
 * Get component documentation
 */
export function getComponentDoc(category, slug) {
  const filePath = join(DOCS_DIR, "components", category, `${slug}.md`);

  if (!existsSync(filePath)) {
    throw new Error(`Component not found: ${category}/${slug}`);
  }

  return readFileSync(filePath, "utf-8");
}

/**
 * Search components by query
 */
export function searchComponents(query) {
  const lowerQuery = query.toLowerCase();
  const components = getAllComponents();

  return components.filter(
    (comp) =>
      comp.name.toLowerCase().includes(lowerQuery) ||
      comp.slug.toLowerCase().includes(lowerQuery) ||
      comp.category.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Search in component content
 */
export function searchInContent(query) {
  const lowerQuery = query.toLowerCase();
  const components = getAllComponents();
  const results = [];

  components.forEach((comp) => {
    try {
      const content = getComponentDoc(comp.category, comp.slug);
      if (content.toLowerCase().includes(lowerQuery)) {
        // Extract context around the match
        const lines = content.split("\n");
        const matchingLines = lines
          .map((line, index) => ({ line, index }))
          .filter(({ line }) => line.toLowerCase().includes(lowerQuery))
          .slice(0, 3); // Limit to 3 matches per component

        results.push({
          component: comp,
          matches: matchingLines.map(({ line, index }) => ({
            line: line.trim(),
            lineNumber: index + 1,
          })),
        });
      }
    } catch (error) {
      // Skip if file not found
    }
  });

  return results;
}

/**
 * Get component by name (fuzzy match)
 */
export function findComponentByName(name) {
  const components = getAllComponents();
  const lowerName = name.toLowerCase();

  // Try exact match first
  let match = components.find(
    (c) => c.name.toLowerCase() === lowerName || c.slug === lowerName,
  );

  // Try partial match
  if (!match) {
    match = components.find(
      (c) =>
        c.name.toLowerCase().includes(lowerName) || c.slug.includes(lowerName),
    );
  }

  return match;
}

/**
 * Get statistics
 */
export function getStats() {
  const index = loadIndex();
  let total = 0;
  let scraped = 0;
  const byCategory = {};

  Object.entries(index.categories || {}).forEach(([category, components]) => {
    const existing = components.filter((c) => c.exists);
    byCategory[category] = {
      total: components.length,
      scraped: existing.length,
      percentage: Math.round((existing.length / components.length) * 100),
    };
    total += components.length;
    scraped += existing.length;
  });

  return {
    total,
    scraped,
    missing: total - scraped,
    percentage: Math.round((scraped / total) * 100),
    byCategory,
  };
}
