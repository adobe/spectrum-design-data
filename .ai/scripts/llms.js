// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Generates llms.txt for each inventory project with `llms: true` (from its
// README and package.json) and a root llms.txt that indexes them.
//
//   node .ai/scripts/llms.js            write files
//   node .ai/scripts/llms.js --check    fail if any file is stale or missing

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GITHUB_BLOB,
  NPM_PACKAGE_BASE,
  REPO_ROOT,
  applyOutputs,
  isMain,
  readJson,
} from "./lib.js";
import { loadInventory } from "./inventory.js";

const MAX_INTRO_CHARS = 1200;
const MAX_SECTIONS = 12;

export function githubSlug(heading) {
  return heading
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
}

/** Extracts the intro paragraph(s) and H2 headings from a README. */
export function readmeSummary(text) {
  const lines = text.replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const intro = [];
  const sections = [];
  let fenced = false;
  let seenTitle = false;
  let inIntro = true;
  for (const line of lines) {
    if (/^```/.test(line)) fenced = !fenced;
    if (fenced || /^```/.test(line)) continue;
    if (/^# /.test(line) && !seenTitle) {
      seenTitle = true;
      continue;
    }
    const h2 = line.match(/^## (.+?)\s*#*$/);
    if (h2) {
      inIntro = false;
      sections.push(h2[1].replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").trim());
      continue;
    }
    if (/^#{3,}/.test(line)) {
      inIntro = false;
      continue;
    }
    if (inIntro && !/^\s*(\[!\[|<|!\[)/.test(line)) intro.push(line);
  }
  let paragraph = intro
    .join("\n")
    .trim()
    .replace(/\n{2,}/g, "\n\n");
  if (paragraph.length > MAX_INTRO_CHARS) {
    paragraph = `${paragraph.slice(0, MAX_INTRO_CHARS).replace(/\s+\S*$/, "")}…`;
  }
  return { intro: paragraph, sections };
}

export function renderPackageLlms(project, root = REPO_ROOT) {
  const pkgPath = join(root, project.path, "package.json");
  const pkg = existsSync(pkgPath) ? readJson(pkgPath) : {};
  const name = pkg.name ?? project.path;
  const description = pkg.description || project.summary;
  const base = `${GITHUB_BLOB}/${project.path}`;
  const readmePath = join(root, project.path, "README.md");
  const hasReadme = existsSync(readmePath);
  const { intro, sections } = hasReadme
    ? readmeSummary(readFileSync(readmePath, "utf8"))
    : { intro: "", sections: [] };

  const out = [`# ${name}`, "", `> ${description.replace(/\s+/g, " ")}`, ""];
  if (intro) out.push(intro, "");
  out.push("## Install", "", `\`npm install ${name}\``, "");
  out.push("## Documentation", "");
  if (hasReadme) {
    out.push(`- [README](${base}/README.md): usage and API overview`);
    for (const heading of sections.slice(0, MAX_SECTIONS)) {
      out.push(`- [${heading}](${base}/README.md#${githubSlug(heading)})`);
    }
  }
  out.push(
    `- [Repository index](${GITHUB_BLOB}/docs/repo-index.md): how this package fits in the repository`,
  );
  out.push("", "## Optional", "");
  if (existsSync(join(root, project.path, "CHANGELOG.md"))) {
    out.push(`- [Changelog](${base}/CHANGELOG.md)`);
  }
  out.push(`- [npm package](${NPM_PACKAGE_BASE}/${name})`);
  out.push(`- [Source](${base}/)`);
  return `${out.join("\n")}\n`;
}

export function renderRootLlms(inventory) {
  const consumer = inventory.projects.filter(
    (p) =>
      p.audience === "consumer" &&
      (p.lifecycle === "active" || p.lifecycle === "incubating"),
  );
  const withLlms = consumer.filter((p) => p.llms);
  const without = consumer.filter((p) => !p.llms);
  const deprecated = inventory.projects.filter(
    (p) => p.lifecycle === "deprecated",
  );
  const maintainer = inventory.projects.filter(
    (p) => p.audience === "maintainer",
  );
  const link = (p, file = "") =>
    file ? `${GITHUB_BLOB}/${p.path}/${file}` : `${GITHUB_BLOB}/${p.path}`;

  const out = [
    "# Spectrum Design Data",
    "",
    "> Adobe's Spectrum design system source of truth: design tokens, the Design Data Specification, component schemas, SDK, CLI, and MCP servers. Spectrum 2 lives on `main`; Spectrum 1 lives on the `s1-legacy` branch.",
    "",
    "This repository is a pnpm and moon monorepo (ES modules, Node.js, plus a Rust SDK). It mixes products for Spectrum users with maintainer tooling. This file indexes the resources meant for external use; each package below publishes its own `llms.txt`.",
    "",
    "## Packages with their own llms.txt",
    "",
  ];
  for (const p of withLlms) {
    out.push(`- [${p.path}](${link(p, "llms.txt")}): ${p.summary}`);
  }
  out.push("", "## Other consumer-facing resources", "");
  for (const p of without) {
    out.push(`- [${p.path}](${link(p)}): ${p.summary}`);
  }
  out.push("", "## Maintainer-only tooling", "");
  out.push(
    `The ${maintainer.length} maintainer tools (release, taxonomy, authoring, and sync utilities) are not intended for Spectrum users, even when published to npm. They are listed in the [repository index](${GITHUB_BLOB}/docs/repo-index.md).`,
  );
  out.push("", "## Optional", "");
  out.push(
    `- [Repository index](${GITHUB_BLOB}/docs/repo-index.md): audience, lifecycle, and publication status for every project`,
  );
  out.push(
    `- [Contributor instructions](${GITHUB_BLOB}/AGENTS.md): conventions for working in this repository`,
  );
  if (deprecated.length > 0) {
    out.push(
      `- Deprecated, kept for compatibility: ${deprecated.map((p) => `\`${p.path}\``).join(", ")}`,
    );
  }
  return `${out.join("\n")}\n`;
}

export function expectedLlms(inventory, root = REPO_ROOT) {
  const outputs = new Map();
  for (const p of inventory.projects.filter((x) => x.llms)) {
    outputs.set(`${p.path}/llms.txt`, renderPackageLlms(p, root));
  }
  outputs.set("llms.txt", renderRootLlms(inventory));
  return outputs;
}

/** Published llms.txt files must be in an explicit npm `files` allowlist. */
export function npmFilesProblems(inventory, root = REPO_ROOT) {
  const problems = [];
  for (const p of inventory.projects.filter((x) => x.llms)) {
    const pkg = readJson(join(root, p.path, "package.json"));
    if (Array.isArray(pkg.files) && !pkg.files.includes("llms.txt")) {
      problems.push(`${p.path}/package.json: "files" must include llms.txt`);
    }
    if (
      existsSync(join(root, p.path, ".npmignore")) &&
      /^\/?llms\.txt$/m.test(
        readFileSync(join(root, p.path, ".npmignore"), "utf8"),
      )
    ) {
      problems.push(`${p.path}/.npmignore: must not exclude llms.txt`);
    }
  }
  return problems;
}

export function runLlms({ check = false, root = REPO_ROOT } = {}) {
  const inventory = loadInventory(root);
  const stale = applyOutputs(expectedLlms(inventory, root), { check });
  return [
    ...stale.map((p) => `out of date: ${p}`),
    ...npmFilesProblems(inventory, root),
  ].filter((p) => check || !p.startsWith("out of date"));
}

if (isMain(import.meta.url)) {
  const check = process.argv.includes("--check");
  const problems = runLlms({ check });
  if (problems.length > 0) {
    console.error(problems.map((p) => `  ${p}`).join("\n"));
    console.error(
      check
        ? "llms.txt check failed. Run `pnpm ai:sync`."
        : "llms.txt problems.",
    );
    process.exit(1);
  }
  console.log(
    check ? "llms.txt files are up to date." : "llms.txt files written.",
  );
}
