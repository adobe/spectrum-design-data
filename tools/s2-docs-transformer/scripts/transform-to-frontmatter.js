#!/usr/bin/env node
/**
 * Transform S2 doc markdown files:
 * 1. Convert blockquote metadata to YAML frontmatter
 * 2. Set correct source_url from file path (slug)
 * 3. Remove "On this page" TOC, HTML comments, duplicate content blocks
 * 4. Skip INDEX.md and README.md
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = "https://s2.spectrum.corp.adobe.com";
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
      } else if (
        e.name.endsWith(".md") &&
        (e.name === "INDEX.md" ||
          e.name === "README.md" ||
          !full.includes("/tools/")) &&
        !full.includes("node_modules")
      ) {
        const rel = path.relative(DOCS_ROOT, full);
        // Skip specific files
        if (
          rel !== "INDEX.md" &&
          rel !== "README.md" &&
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

function slugFromRel(rel) {
  const base = path.basename(rel, ".md");
  return base;
}

function categoryFromRel(rel) {
  const dir = path.dirname(rel);
  return dir || "root";
}

function sourceUrlFromSlug(slug) {
  return `${BASE_URL}/page/${slug}/`;
}

function stripExistingFrontmatter(content) {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (fmMatch) {
    return { frontmatter: fmMatch[1], body: content.slice(fmMatch[0].length) };
  }
  return { frontmatter: null, body: content };
}

function parseFrontmatterYaml(yaml) {
  const out = {};
  for (const line of yaml.split("\n")) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

function extractTitle(content, existingFm) {
  if (existingFm && existingFm.title) return existingFm.title;
  const m = content.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : path.basename(content, ".md");
}

function extractLastUpdated(content, existingFm) {
  if (existingFm && existingFm.last_updated) return existingFm.last_updated;
  const m = content.match(/>\s*Last updated:\s*([^\n]+)/);
  return m ? m[1].trim() : null;
}

function extractBlockquoteSource(content) {
  const m = content.match(/>\s*Source:\s*([^\n]+)/);
  return m ? m[1].trim() : null;
}

function removeBlockquoteMeta(body) {
  return body
    .replace(/^>\s*Last updated:.*$/gm, "")
    .replace(/^>\s*Source:.*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removeOnThisPage(body) {
  return body
    .replace(/(^|\n)## On this page\n\n(?:- \[[^\]]+\]\(#[^)]+\)\n)*/gi, "\n")
    .replace(/(^|\n)## On this page\n\n/gi, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removeHtmlComments(body) {
  return body
    .replace(/\s*<!--[^]*?-->\s*/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removeDuplicateParagraphBlocks(body) {
  const paragraphs = body.split(/\n\n+/);
  const seen = new Set();
  const out = [];
  for (const p of paragraphs) {
    const normalized = p.replace(/\s+/g, " ").trim();
    if (normalized.length > 150 && seen.has(normalized)) {
      continue;
    }
    if (normalized.length > 150) seen.add(normalized);
    out.push(p);
  }
  return out
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removeEmptySections(body) {
  return body.replace(/\n## [^\n]+\n\n(\s*)\n/g, (match, blank) => {
    if (blank.trim() === "") return "\n";
    return match;
  });
}

function buildFrontmatter(opts) {
  const lines = [
    "---",
    `title: ${JSON.stringify(opts.title)}`,
    `source_url: ${opts.source_url}`,
  ];
  if (opts.last_updated) {
    lines.push(`last_updated: ${opts.last_updated}`);
  }
  lines.push(`category: ${opts.category}`);
  if (opts.component_type) {
    lines.push(`component_type: ${opts.component_type}`);
  }
  lines.push("status: published");
  if (opts.tags && opts.tags.length) {
    lines.push(`tags:\n${opts.tags.map((t) => `  - ${t}`).join("\n")}`);
  }
  lines.push("---", "");
  return lines.join("\n");
}

const COMPONENT_TYPE_SINGULAR = {
  actions: "action",
  inputs: "input",
  containers: "container",
};
function getComponentType(category) {
  if (category.startsWith("components/")) {
    const sub = category.split("/")[1];
    return sub ? COMPONENT_TYPE_SINGULAR[sub] || sub : null;
  }
  return null;
}

function getTagsForCategory(category, title) {
  const tags = [category.replace(/\//g, "-")];
  const t = (title || "").toLowerCase();
  if (t.includes("button")) tags.push("action", "button", "interactive");
  if (t.includes("menu")) tags.push("navigation", "menu", "dropdown");
  if (
    t.includes("input") ||
    t.includes("field") ||
    t.includes("checkbox") ||
    t.includes("select")
  )
    tags.push("input", "form");
  if (
    t.includes("dialog") ||
    t.includes("modal") ||
    t.includes("alert") ||
    t.includes("toast")
  )
    tags.push("feedback", "overlay");
  if (t.includes("color")) tags.push("design-tokens", "color");
  if (category.startsWith("designing/")) tags.push("design", "guidelines");
  if (category.startsWith("fundamentals/"))
    tags.push("fundamentals", "principles");
  return [...new Set(tags)];
}

function transform(content, relPath) {
  const { frontmatter: existingFmStr, body: contentAfterFm } =
    stripExistingFrontmatter(content);
  const existingFm = existingFmStr ? parseFrontmatterYaml(existingFmStr) : {};
  const slug = slugFromRel(relPath);
  const category = categoryFromRel(relPath);
  const source_url = sourceUrlFromSlug(slug);
  const title = extractTitle(contentAfterFm, existingFm);
  const last_updated = extractLastUpdated(contentAfterFm, existingFm);

  let body = contentAfterFm.replace(/^#\s+[^\n]+\n\n/, "").trim();
  body = removeBlockquoteMeta(body);
  body = removeOnThisPage(body);
  body = removeHtmlComments(body);
  body = removeDuplicateParagraphBlocks(body);
  body = removeEmptySections(body);

  const componentType = getComponentType(category);
  const tags = getTagsForCategory(category, title);

  const frontmatter = buildFrontmatter({
    title,
    source_url,
    last_updated,
    category,
    component_type: componentType || undefined,
    tags,
  });

  return frontmatter + "# " + title + "\n\n" + body.trim() + "\n";
}

function main() {
  const files = getDocFiles();
  console.error(`Transforming ${files.length} files...`);
  let ok = 0;
  let err = 0;
  for (const rel of files) {
    const full = path.join(DOCS_ROOT, rel);
    try {
      const content = fs.readFileSync(full, "utf-8");
      const out = transform(content, rel);
      fs.writeFileSync(full, out, "utf-8");
      ok++;
    } catch (e) {
      console.error(`Error ${rel}:`, e.message);
      err++;
    }
  }
  console.error(`Done: ${ok} ok, ${err} errors`);
  process.exit(err ? 1 : 0);
}

main();
