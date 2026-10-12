// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Validates .ai/inventory.json against the workspace and generates
// docs/repo-index.md.
//
//   node .ai/scripts/inventory.js            write the index
//   node .ai/scripts/inventory.js --check    validate and fail if the index is stale

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT, applyOutputs, isMain, listFiles, readJson } from "./lib.js";

export const INVENTORY_PATH = ".ai/inventory.json";
export const INDEX_PATH = "docs/repo-index.md";

const KINDS = ["package", "crate", "area", "content"];
const AUDIENCES = ["consumer", "maintainer", "demo"];
const LIFECYCLES = ["active", "incubating", "deprecated", "one-time"];

export function loadInventory(root = REPO_ROOT) {
  return readJson(join(root, INVENTORY_PATH));
}

function manifestName(root, path) {
  const pkg = join(root, path, "package.json");
  if (existsSync(pkg)) return readJson(pkg).name ?? null;
  const cargo = join(root, path, "Cargo.toml");
  if (existsSync(cargo)) {
    const match = readFileSync(cargo, "utf8").match(
      /^\[package\][^[]*?^name\s*=\s*"([^"]+)"/ms,
    );
    return match ? match[1] : null;
  }
  return null;
}

function isPrivate(root, path) {
  const pkg = join(root, path, "package.json");
  return existsSync(pkg) ? readJson(pkg).private === true : null;
}

/** Directories that contain a tracked package.json or Cargo.toml. */
export function manifestDirs(files) {
  const dirs = new Set();
  for (const file of files) {
    const match = file.match(/^(.*)\/(package\.json|Cargo\.toml)$/);
    if (
      match &&
      !match[1].includes("node_modules") &&
      !match[1].startsWith(".proto/")
    ) {
      dirs.add(match[1]);
    }
  }
  return [...dirs].sort();
}

export function validateInventory(
  inventory,
  { root = REPO_ROOT, files = listFiles(root) } = {},
) {
  const errors = [];
  const seen = new Set();

  for (const p of inventory.projects) {
    const where = `inventory entry ${p.path}`;
    if (seen.has(p.path)) errors.push(`${where}: duplicate path`);
    seen.add(p.path);
    if (!existsSync(join(root, p.path))) {
      errors.push(`${where}: path does not exist`);
      continue;
    }
    if (!KINDS.includes(p.kind)) errors.push(`${where}: invalid kind`);
    if (!AUDIENCES.includes(p.audience))
      errors.push(`${where}: invalid audience`);
    if (!LIFECYCLES.includes(p.lifecycle))
      errors.push(`${where}: invalid lifecycle`);
    if (!p.summary) errors.push(`${where}: missing summary`);
    if (typeof p.published !== "boolean" || typeof p.llms !== "boolean") {
      errors.push(`${where}: published and llms must be booleans`);
    }

    const priv = isPrivate(root, p.path);
    if (priv !== null && p.published === priv) {
      errors.push(
        `${where}: published=${p.published} contradicts package.json private=${priv}`,
      );
    }
    if (priv === null && p.published) {
      errors.push(`${where}: published projects need a package.json`);
    }
    if (p.llms) {
      if (
        !p.published ||
        p.audience !== "consumer" ||
        p.lifecycle !== "active"
      ) {
        errors.push(
          `${where}: llms requires a published, active, consumer-facing package`,
        );
      }
    }
    if (p.kind !== "content" && !existsSync(join(root, p.path, "AGENTS.md"))) {
      errors.push(`${where}: missing AGENTS.md`);
    }
    if (p.kind !== "content") {
      const claude = join(root, p.path, "CLAUDE.md");
      if (existsSync(claude) && !isPointer(readFileSync(claude, "utf8"))) {
        errors.push(`${where}: CLAUDE.md must only point to AGENTS.md`);
      }
    }
  }

  const included = new Set(inventory.projects.flatMap((p) => p.includes ?? []));
  for (const dir of manifestDirs(files)) {
    if (dir === "" || seen.has(dir) || included.has(dir)) continue;
    errors.push(`${dir}: workspace project is not listed in the inventory`);
  }
  return errors;
}

export function isPointer(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("<!--"));
  return lines.length <= 3 && /AGENTS\.md/.test(text);
}

const SECTIONS = [
  {
    title: "Consumer-facing",
    description:
      "Products and libraries for people building with Spectrum. Active and incubating only.",
    match: (p) =>
      p.audience === "consumer" &&
      (p.lifecycle === "active" || p.lifecycle === "incubating"),
  },
  {
    title: "Maintainer tooling",
    description:
      "Repository housekeeping, release, taxonomy, and authoring tools. Not intended for Spectrum users, even where published to npm.",
    match: (p) => p.audience === "maintainer" && p.lifecycle === "active",
  },
  {
    title: "Demos",
    description: "Repository demonstrations.",
    match: (p) => p.audience === "demo",
  },
  {
    title: "Deprecated and one-time",
    description:
      "Kept for compatibility or retained until their consumers are checked. Do not move or remove published packages without an explicit deprecation plan.",
    match: (p) => p.lifecycle === "deprecated" || p.lifecycle === "one-time",
  },
];

export function renderIndex(inventory, root = REPO_ROOT) {
  const claimed = new Set();
  const out = [
    "<!-- Copyright 2026 Adobe. All rights reserved. -->",
    "<!-- GENERATED by .ai/scripts/inventory.js from .ai/inventory.json. Do not edit; run `pnpm ai:sync`. -->",
    "",
    "# Repository index",
    "",
    "Audience, lifecycle, and npm publication are separate facts. A package can be published and internal, or consumer-facing and deprecated. The source of truth is [`.ai/inventory.json`](../.ai/inventory.json).",
    "",
  ];
  for (const section of SECTIONS) {
    const rows = inventory.projects.filter(
      (p) => !claimed.has(p.path) && section.match(p),
    );
    rows.forEach((p) => claimed.add(p.path));
    if (rows.length === 0) continue;
    out.push(`## ${section.title}`, "", section.description, "");
    out.push(
      "| Path | Package | Lifecycle | npm | llms.txt | Summary |",
      "| --- | --- | --- | --- | --- | --- |",
    );
    for (const p of rows) {
      const name = manifestName(root, p.path);
      out.push(
        `| [\`${p.path}\`](../${p.path}/) | ${name ? `\`${name}\`` : "—"} | ${p.lifecycle} | ${p.published ? "published" : "no"} | ${p.llms ? "yes" : "no"} | ${p.summary} |`,
      );
    }
    out.push("");
  }
  return `${out.join("\n").trimEnd()}\n`;
}

export function runInventory({ check = false, root = REPO_ROOT } = {}) {
  const inventory = loadInventory(root);
  const errors = validateInventory(inventory, { root });
  const stale = applyOutputs(
    new Map([[INDEX_PATH, renderIndex(inventory, root)]]),
    { check },
  );
  if (check) errors.push(...stale.map((p) => `out of date: ${p}`));
  return errors;
}

if (isMain(import.meta.url)) {
  const check = process.argv.includes("--check");
  const errors = runInventory({ check });
  if (errors.length > 0) {
    console.error(errors.map((e) => `  ${e}`).join("\n"));
    console.error(
      check
        ? "Inventory check failed. Run `pnpm ai:sync`."
        : "Inventory invalid.",
    );
    process.exit(1);
  }
  console.log(check ? "Inventory is valid." : `Wrote ${INDEX_PATH}.`);
}
