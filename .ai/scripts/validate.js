// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Validates AI resources: rule and skill frontmatter, glob coverage, links,
// generated files, symlinks, the inventory, and generated llms.txt files.
//
//   node .ai/scripts/validate.js

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { globSync } from "glob";
import { REPO_ROOT, isMain, listFiles, parseFrontmatter } from "./lib.js";
import { runInventory } from "./inventory.js";
import { runLlms } from "./llms.js";
import { readRules, splitGlobs, sync } from "./sync.js";

export function validateRules(root = REPO_ROOT) {
  const errors = [];
  for (const rule of readRules(root)) {
    const where = `.ai/rules/${rule.file}`;
    if (!rule.data) {
      errors.push(`${where}: missing frontmatter`);
      continue;
    }
    if (!rule.data.description) errors.push(`${where}: missing description`);
    const globs = splitGlobs(rule.data.globs);
    if (globs.length === 0) {
      errors.push(`${where}: missing globs`);
      continue;
    }
    for (const glob of globs) {
      const matches = globSync(glob, {
        cwd: root,
        dot: true,
        ignore: ["**/node_modules/**", "sdk/target/**", ".claude/worktrees/**"],
      });
      if (matches.length === 0) {
        errors.push(`${where}: glob "${glob}" matches no files`);
      }
    }
  }
  return errors;
}

export function validateSkills(root = REPO_ROOT) {
  const errors = [];
  const dir = join(root, ".ai/skills");
  if (!existsSync(dir)) return errors;
  for (const name of readdirSync(dir)) {
    const skill = join(dir, name, "SKILL.md");
    const where = `.ai/skills/${name}`;
    if (!existsSync(skill)) {
      errors.push(`${where}: missing SKILL.md`);
      continue;
    }
    const { data } = parseFrontmatter(readFileSync(skill, "utf8"));
    if (!data) errors.push(`${where}/SKILL.md: missing frontmatter`);
    else {
      if (data.name !== name) {
        errors.push(`${where}/SKILL.md: name must equal directory "${name}"`);
      }
      if (!data.description) {
        errors.push(`${where}/SKILL.md: missing description`);
      }
    }
  }
  return errors;
}

const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

/** Relative markdown links in AI instruction files must resolve. */
export function validateLinks(root = REPO_ROOT, files = listFiles(root)) {
  const errors = [];
  const targets = files.filter(
    (f) =>
      f === ".ai/README.md" ||
      f.startsWith(".ai/rules/") ||
      /(^|\/)AGENTS\.md$/.test(f),
  );
  for (const file of targets) {
    const text = readFileSync(join(root, file), "utf8").replace(
      /```[\s\S]*?```/g,
      "",
    );
    for (const match of text.matchAll(LINK)) {
      const href = match[1].split("#")[0];
      if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href)) continue;
      if (!existsSync(resolve(dirname(join(root, file)), href))) {
        errors.push(`${file}: broken link ${match[1]}`);
      }
    }
  }
  return errors;
}

export function validateAll(root = REPO_ROOT) {
  return [
    ...validateRules(root),
    ...validateSkills(root),
    ...validateLinks(root),
    ...sync({ check: true, root }),
    ...runInventory({ check: true, root }),
    ...runLlms({ check: true, root }),
  ];
}

if (isMain(import.meta.url)) {
  const errors = validateAll();
  if (errors.length > 0) {
    console.error(errors.map((e) => `  ${e}`).join("\n"));
    console.error(`AI resource validation failed (${errors.length} problems).`);
    process.exit(1);
  }
  console.log("AI resources are valid.");
}
