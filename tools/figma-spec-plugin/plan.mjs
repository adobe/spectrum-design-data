// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// What to generate in Figma, and how. `plan` builds the sheets, changelogs and `use_figma`
// payloads for the requested components and compares each with figma-files.json (the registry
// of spec files). `record` stores the result of a run. An agent follows the output with the
// Figma MCP; see .ai/skills/figma-spec-sheets/SKILL.md.
//
//   node plan.mjs plan [--all | <component>...] [-o <dir>] [--registry <file>]
//   node plan.mjs record <component> --hash <sha> [--file-key <key>] [--registry <file>]

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPayloads, coreSource, LIMIT } from "./payloads.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const defaultRegistry = join(here, "figma-files.json");

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const sha = (...parts) => {
  const h = createHash("sha256");
  for (const p of parts) h.update(p ?? "");
  return h.digest("hex").slice(0, 16);
};

const cliPath = () =>
  process.env.DESIGN_DATA_CLI ??
  join(
    resolve(root, process.env.CARGO_TARGET_DIR ?? "sdk/target"),
    "debug/design-data",
  );

/** The action an agent takes for one component: create the file, update it, or nothing. */
export function actionFor(entry, hash) {
  if (!entry?.fileKey) return "create";
  return entry.hash === hash ? "current" : "update";
}

export function plan({ components, all, out, registryPath = defaultRegistry }) {
  const registry = readJson(registryPath);
  const sheets = join(out, "sheets");
  mkdirSync(sheets, { recursive: true });
  execFileSync(
    cliPath(),
    [
      "spec-sheet",
      "--all",
      "--changelog-dir",
      join(root, "packages/design-data/changelog"),
      "-o",
      sheets,
    ],
    { cwd: root, stdio: "pipe" },
  );
  const index = readJson(join(sheets, "index.json")).components;
  const wanted = all
    ? index.map((c) => c.component)
    : components.length
      ? components
      : Object.keys(registry.files);
  const core = coreSource();
  const items = wanted.map((component) => {
    const sheetFile = join(sheets, `${component}.json`);
    const changelogFile = join(
      root,
      "packages/design-data/changelog",
      `${component}.json`,
    );
    let sheetText;
    try {
      sheetText = readFileSync(sheetFile, "utf8");
    } catch {
      throw new Error(`no sheet for '${component}'`);
    }
    let changelogText = null;
    try {
      changelogText = readFileSync(changelogFile, "utf8");
    } catch {
      // A component no release has changed has no changelog.
    }
    const sheet = JSON.parse(sheetText);
    const hash = sha(sheetText, changelogText, core);
    const entry = registry.files[component];
    const action = actionFor(entry, hash);
    const item = {
      component,
      displayName: sheet.displayName,
      action,
      fileKey: entry?.fileKey ?? null,
      fileName: `${sheet.displayName} \u2013 spec (generated)`,
      hash,
      payloads: [],
    };
    if (action !== "current") {
      const dir = join(out, "payloads", component);
      mkdirSync(dir, { recursive: true });
      const payloads = buildPayloads({
        sheet,
        changelog: changelogText ? JSON.parse(changelogText) : null,
      });
      item.payloads = payloads.map((p, i) => {
        const file = join(dir, `${String(i + 1).padStart(2, "0")}.js`);
        writeFileSync(file, p.code);
        return { file, chars: p.chars, steps: p.steps };
      });
    }
    return item;
  });
  const result = {
    plan: registry.plan,
    project: registry.project,
    limit: LIMIT,
    items,
    summary: Object.fromEntries(
      ["create", "update", "current"].map((a) => [
        a,
        items.filter((i) => i.action === a).length,
      ]),
    ),
  };
  writeFileSync(join(out, "plan.json"), JSON.stringify(result, null, 2) + "\n");
  return result;
}

export function record({
  component,
  hash,
  fileKey,
  registryPath = defaultRegistry,
  date,
}) {
  const registry = readJson(registryPath);
  const entry = registry.files[component] ?? {};
  registry.files[component] = {
    fileKey: fileKey ?? entry.fileKey ?? null,
    hash,
    generatedAt: date ?? new Date().toISOString().slice(0, 10),
  };
  if (!registry.files[component].fileKey)
    throw new Error(`'${component}' has no fileKey: pass --file-key`);
  registry.files = Object.fromEntries(
    Object.entries(registry.files).sort(([a], [b]) => (a < b ? -1 : 1)),
  );
  writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
  return registry.files[component];
}

function main(argv) {
  const [cmd, ...rest] = argv;
  const opts = { positional: [], out: null, registry: defaultRegistry };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "-o") opts.out = rest[++i];
    else if (a === "--registry") opts.registry = rest[++i];
    else if (a === "--all") opts.all = true;
    else if (a === "--hash") opts.hash = rest[++i];
    else if (a === "--file-key") opts.fileKey = rest[++i];
    else opts.positional.push(a);
  }
  if (cmd === "plan") {
    const out = opts.out ?? join(root, "tools/figma-spec-plugin/.out");
    const r = plan({
      components: opts.positional,
      all: opts.all,
      out,
      registryPath: opts.registry,
    });
    console.error(
      `plan: ${JSON.stringify(r.summary)}; written to ${join(out, "plan.json")}`,
    );
  } else if (cmd === "record" && opts.positional[0] && opts.hash) {
    const r = record({
      component: opts.positional[0],
      hash: opts.hash,
      fileKey: opts.fileKey,
      registryPath: opts.registry,
    });
    console.error(`recorded ${opts.positional[0]}: ${JSON.stringify(r)}`);
  } else {
    throw new Error(
      "usage: plan.mjs plan [--all | <component>...] [-o dir] | record <component> --hash <sha> [--file-key k]",
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main(process.argv.slice(2));
