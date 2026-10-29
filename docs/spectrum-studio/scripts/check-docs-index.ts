// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Keeps docs/README.md and docs/archive/README.md in step with the files in docs/.
 * It checks that every doc is indexed and every index link resolves. It does not check links inside the docs
 * themselves (some docs are hashed evidence pins and cannot be edited).
 */
export function docsIndexIssues(
  files: readonly string[],
  indexLinks: readonly string[],
  archiveIndexText: string,
  exists: (path: string) => boolean,
): string[] {
  const issues: string[] = [];
  const linked = new Set(indexLinks);
  for (const file of files) {
    if (file === "README.md" || file === "archive/README.md") continue;
    if (file.startsWith("archive/")) {
      if (!archiveIndexText.includes(file.slice("archive/".length)))
        issues.push(`${file} is not listed in docs/archive/README.md.`);
    } else if (!linked.has(file))
      issues.push(`${file} is not listed in docs/README.md.`);
  }
  for (const link of indexLinks)
    if (!exists(link))
      issues.push(`docs/README.md links to ${link}, which does not exist.`);
  return issues;
}

const root = fileURLToPath(new URL("../docs/", import.meta.url));
function walk(relative = ""): string[] {
  return readdirSync(join(root, relative), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) return walk(path);
      return entry.name.endsWith(".md") ? [path] : [];
    },
  );
}
const indexText = readFileSync(join(root, "README.md"), "utf8");
const indexLinks = [
  ...indexText.matchAll(/\]\(([^)#\s]+\.md)(?:#[^)]*)?\)/g),
].map((match) =>
  normalize(match[1] ?? "")
    .split(sep)
    .join("/"),
);
const issues = docsIndexIssues(
  walk(),
  indexLinks,
  readFileSync(join(root, "archive/README.md"), "utf8"),
  (path) => existsSync(join(root, path)),
);
assert.deepEqual(
  issues,
  [],
  `Docs index is out of date. Update docs/README.md (or docs/archive/README.md) in the same change:\n${issues.join("\n")}`,
);
console.log("Docs index lists every document and every link resolves.");
