/**
 * S2 Documentation Data Access
 *
 * Reads Spectrum 2 component documentation from the design-data component
 * JSON (`packages/design-data/components/*.json`), which the Spectrum Hub sync
 * workflows keep current. A copy is bundled into `data/` at publish time
 * (see tasks/bundleDocs.js); in the monorepo the package data is read directly.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const bundledPath = join(__dirname, "../../data");
const repoPath = join(__dirname, "../../../../packages/design-data");
const DATA_DIR = existsSync(join(bundledPath, "components"))
  ? bundledPath
  : repoPath;

const COMPONENTS_DIR = join(DATA_DIR, "components");

let cache = null;

function loadComponents() {
  if (cache) return cache;
  cache = [];
  if (!existsSync(COMPONENTS_DIR)) return cache;

  for (const file of readdirSync(COMPONENTS_DIR).sort()) {
    if (!file.endsWith(".json")) continue;
    const doc = JSON.parse(readFileSync(join(COMPONENTS_DIR, file), "utf-8"));
    cache.push({
      slug: doc.name ?? file.replace(".json", ""),
      name: doc.displayName ?? doc.name,
      category: doc.meta?.category ?? "uncategorized",
      url: doc.meta?.documentationUrl,
      description: doc.description,
      documentBlocks: doc.documentBlocks ?? [],
    });
  }
  return cache;
}

function toSummary({ documentBlocks, ...summary }) {
  return summary;
}

function renderBlock(block) {
  if (block.type === "do-dont") {
    return [
      `**Do:** ${block.content}`,
      block.dont ? `**Don't:** ${block.dont}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");
  }
  return block.content;
}

/**
 * Get list of all components
 */
export function getAllComponents() {
  return loadComponents().map(toSummary);
}

/**
 * Get the sorted list of component categories
 */
export function getCategories() {
  return [...new Set(loadComponents().map((c) => c.category))].sort();
}

/**
 * Get components by category
 */
export function getComponentsByCategory(category) {
  return getAllComponents().filter((comp) => comp.category === category);
}

/**
 * Get component documentation rendered as Markdown
 */
export function getComponentDoc(category, slug) {
  const component = loadComponents().find(
    (c) => c.slug === slug && (!category || c.category === category),
  );

  if (!component) {
    throw new Error(`Component not found: ${category}/${slug}`);
  }

  const lines = [`# ${component.name}`];
  if (component.url) lines.push(`Source: ${component.url}`);
  for (const block of component.documentBlocks) {
    lines.push(renderBlock(block));
  }
  return lines.join("\n\n");
}

/**
 * Search components by query
 */
export function searchComponents(query) {
  const lowerQuery = query.toLowerCase();

  return getAllComponents().filter(
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
  const results = [];

  for (const comp of getAllComponents()) {
    const content = getComponentDoc(comp.category, comp.slug);
    if (!content.toLowerCase().includes(lowerQuery)) continue;

    const matchingLines = content
      .split("\n")
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
  const components = getAllComponents();
  const byCategory = {};

  for (const { category } of components) {
    byCategory[category] ??= { total: 0 };
    byCategory[category].total += 1;
  }

  return { total: components.length, byCategory };
}
