// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Turns a spec sheet (and changelog) into `use_figma` payloads: JavaScript an agent sends to
// the Figma MCP, one call per file, in order. `use_figma` keeps no state between calls and has
// no UI, so every payload carries the renderer core (code.js without its plugin shell) plus the
// slice of the sheet it draws. The sheet is built under a "(building)" name by the first
// payload and takes its final name in the last one, so a failed run keeps the previous render.
//
// Usage: node payloads.mjs <sheet.json> [--changelog <file>] [--pages Layout,Color] -o <dir>

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
/** `use_figma` accepts 50,000 characters of code; keep a margin for the call wrapper. */
export const LIMIT = 45000;

/** code.js minus the desktop plugin shell and full-line comments. */
export function coreSource(
  source = readFileSync(join(here, "code.js"), "utf8"),
) {
  const begin = source.indexOf("// shell:begin");
  const end = source.indexOf("// shell:end");
  if (begin < 0 || end < begin) throw new Error("code.js has no shell markers");
  return (source.slice(0, begin) + source.slice(end + "// shell:end".length))
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n")
    .replace(/\n{2,}/g, "\n");
}

const pick = (o, keys) =>
  Object.fromEntries(
    keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]),
  );

const NODE_KEYS = [
  "part",
  "kind",
  "x",
  "y",
  "w",
  "h",
  "fill",
  "stroke",
  "stroke_width",
  "radius",
  "radii",
  "text",
  "font_size",
  "font_weight",
  "color",
  "icon",
  "rotation",
];

/** A block reduced to the fields the renderer reads (see code.js). */
export function slimBlock(b) {
  const r = b.render;
  return {
    title: b.title,
    titleSource: b.titleSource,
    badges: b.badges,
    rows: b.rows.map((row) => ({
      conditions: row.conditions,
      items: row.items.map((i) => ({
        marker: i.marker,
        label: i.label,
        source: i.source,
        token: { name: i.token.name },
        values: i.values,
      })),
    })),
    render: r && {
      view: r.view,
      request: { options: pick(r.request.options, ["staticColor"]) },
      scene: {
        nodes: r.scene.nodes.map((n) => pick(n, NODE_KEYS)),
        measurements: (r.scene.measurements ?? []).map((m) => ({
          ...pick(m, ["kind", "x", "y", "w", "h"]),
          token: { value: m.token.value },
        })),
      },
      markers: r.markers,
      measurements: r.measurements.map((m) => pick(m, ["index", "label"])),
    },
  };
}

/** A changelog reduced to what the changelog frame lists; commits without entries drop out. */
export function slimChangelog(c) {
  return {
    baseline: c.baseline ? { release: c.baseline.release } : null,
    releases: c.releases.map((r) => ({
      ...pick(r, ["version", "bump", "release", "date"]),
      commits: r.commits
        .filter((cm) => cm.entries.length)
        .map((cm) => ({
          date: cm.date,
          source: pick(cm.source, [
            "type",
            "number",
            "title",
            "sha",
            "subject",
          ]),
          entries: cm.entries.map((e) => ({ class: e.class })),
        })),
    })),
  };
}

const json = (v) => JSON.stringify(v);

function callSource(c) {
  switch (c.fn) {
    case "begin":
      return `results.push(await beginSheet(META, ${json(c.pages)}));`;
    case "changelog":
      return `results.push(await appendChangelog(META, ${json(c.data)}));`;
    case "blocks":
      return `results.push(await appendBlocks(META, ${json(c.page)}, ${json(c.blocks)}));`;
    default:
      return "results.push(await finishSheet(META));";
  }
}

const describe = (c) =>
  c.fn === "blocks" ? `blocks ${c.page} x${c.blocks.length}` : c.fn;

/**
 * Payloads for one sheet. `pages` limits the pages drawn (default all). Each payload is
 * `{ code, steps, chars }`; run them in order, one `use_figma` call each.
 */
export function buildPayloads({ sheet, changelog, pages, limit = LIMIT }) {
  const core = coreSource();
  const drawn = sheet.pages.filter((p) => !pages || pages.includes(p.title));
  const meta = {
    ...pick(sheet, ["displayName", "size", "block", "datasetRevision"]),
    pages: drawn.map((p) => ({ title: p.title })),
  };
  const head = `${core}\nconst META = ${json(meta)};\nconst results = [];\n`;
  const tail = "return results;\n";
  const base = head.length + tail.length;
  const sizeOf = (calls) =>
    base + calls.reduce((n, c) => n + callSource(c).length + 1, 0);

  const units = [{ fn: "begin", pages: drawn.map((p) => p.title) }];
  if (changelog)
    units.push({ fn: "changelog", data: slimChangelog(changelog) });
  for (const p of drawn)
    for (const b of p.blocks)
      units.push({ fn: "blocks", page: p.title, blocks: [slimBlock(b)] });
  units.push({ fn: "finish" });

  const payloads = [];
  let calls = [];
  const flush = () => {
    if (!calls.length) return;
    const body = calls.map(callSource).join("\n");
    payloads.push({
      code: `${head}${body}\n${tail}`,
      steps: calls.map(describe),
      chars: sizeOf(calls),
    });
    calls = [];
  };
  for (const u of units) {
    const last = calls[calls.length - 1];
    const merged =
      u.fn === "blocks" && last?.fn === "blocks" && last.page === u.page
        ? [
            ...calls.slice(0, -1),
            { ...last, blocks: [...last.blocks, ...u.blocks] },
          ]
        : [...calls, u];
    if (sizeOf(merged) <= limit) {
      calls = merged;
      continue;
    }
    flush();
    if (sizeOf([u]) > limit)
      throw new Error(
        `${describe(u)} alone is ${sizeOf([u])} characters; the limit is ${limit}`,
      );
    calls = [u];
  }
  flush();
  return payloads;
}

function main(argv) {
  const args = { out: null, changelog: null, pages: null, sheet: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-o") args.out = argv[++i];
    else if (a === "--changelog") args.changelog = argv[++i];
    else if (a === "--pages") args.pages = argv[++i].split(",");
    else args.sheet = a;
  }
  if (!args.sheet || !args.out)
    throw new Error(
      "usage: payloads.mjs <sheet.json> [--changelog f] [--pages a,b] -o <dir>",
    );
  const read = (p) => JSON.parse(readFileSync(p, "utf8"));
  const sheet = read(args.sheet);
  const payloads = buildPayloads({
    sheet,
    changelog: args.changelog ? read(args.changelog) : null,
    pages: args.pages,
  });
  mkdirSync(args.out, { recursive: true });
  const files = payloads.map((p, i) => {
    const file = `${sheet.component}-${String(i + 1).padStart(2, "0")}.js`;
    writeFileSync(join(args.out, file), p.code);
    return { file, chars: p.chars, steps: p.steps };
  });
  writeFileSync(
    join(args.out, `${sheet.component}.manifest.json`),
    JSON.stringify(
      {
        component: sheet.component,
        displayName: sheet.displayName,
        limit: LIMIT,
        payloads: files,
      },
      null,
      2,
    ) + "\n",
  );
  console.error(
    `wrote ${files.length} payload(s) for ${sheet.component} to ${args.out}`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main(process.argv.slice(2));
