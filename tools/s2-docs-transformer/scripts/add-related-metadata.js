#!/usr/bin/env node
/**
 * Add related_components and parent_category to YAML frontmatter by parsing
 * "## Related Components" section links (/page/slug/ -> slug).
 */

const fs = require("fs");
const path = require("path");

const DOCS_ROOT = path.join(__dirname, "..", "..", "..", "docs", "s2-docs");

function getDocFiles() {
  const files = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (
          e.name !== "node_modules" &&
          e.name !== "scripts" &&
          !full.includes("/tools/")
        ) {
          walk(full);
        }
      } else if (e.name.endsWith(".md")) {
        const rel = path.relative(DOCS_ROOT, full);
        if (
          !rel.includes("node_modules") &&
          rel !== "INDEX.md" &&
          rel !== "README.md" &&
          !rel.startsWith("tools/") &&
          !rel.includes("contact.md") &&
          !rel.includes("spectrum-quarterly-recap.md")
        ) {
          files.push(rel);
        }
      }
    }
  }
  walk(DOCS_ROOT);
  return files.sort();
}

function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return { fm: null, body: content };
  return {
    fm: m[1],
    body: content.slice(m[0].length),
    fmRange: [0, m[0].length],
  };
}

function extractRelatedSlugs(body) {
  const section = body.match(/## Related Components\n\n([\s\S]*?)(?=\n## |$)/i);
  if (!section) return [];
  const links = section[1].matchAll(/\/page\/([^/]+)\//g);
  return [...new Set([...links].map(([, slug]) => slug))];
}

function getParentCategory(relPath) {
  const dir = path.dirname(relPath);
  if (dir.startsWith("components/")) {
    return path.dirname(relPath).split("/").pop();
  }
  return null;
}

function hasKey(fm, key) {
  return new RegExp(`^${key}:`, "m").test(fm);
}

function addRelatedToFrontmatter(fm, related, parentCategory) {
  const toAdd = [];
  if (related.length && !hasKey(fm, "related_components")) {
    toAdd.push("related_components:");
    related.forEach((s) => toAdd.push(`  - ${s}`));
  }
  if (parentCategory && !hasKey(fm, "parent_category")) {
    toAdd.push(`parent_category: ${parentCategory}`);
  }
  if (toAdd.length === 0) return fm;
  return fm.trimEnd() + "\n" + toAdd.join("\n") + "\n";
}

function main() {
  const files = getDocFiles();
  let updated = 0;
  for (const rel of files) {
    const full = path.join(DOCS_ROOT, rel);
    const content = fs.readFileSync(full, "utf-8");
    const { fm, body } = parseFrontmatter(content);
    if (!fm) continue;
    const related = extractRelatedSlugs(body);
    const parentCategory = getParentCategory(rel);
    const newFm = addRelatedToFrontmatter(fm, related, parentCategory);
    if (newFm !== fm) {
      const newContent = "---\n" + newFm + "\n---\n" + body;
      fs.writeFileSync(full, newContent, "utf-8");
      updated++;
    }
  }
  console.error(`Updated frontmatter in ${updated} files.`);
}

main();
