#!/usr/bin/env node
// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Regenerates icons/ui.json and icons/workflow.json from a React Spectrum checkout at a
// commit: node scripts/import-icons.mjs <react-spectrum checkout> <sha>
// Files are read with `git show <sha>:<path>`, so the checkout's working tree is not used
// and the same SHA always produces the same output. Colour is dropped (every source path
// fills with var(--iconPrimary, …)); renderers apply the part's colour.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const S2 = "packages/@react-spectrum/s2";
const UI_DIR = `${S2}/ui-icons`;
const WORKFLOW_DIR = `${S2}/s2wf-icons`;
// Demo workflow icons; Add is the default. The full set (about 400) stays out.
export const WORKFLOW_ICONS = ["Add", "Edit", "Delete", "Settings", "Search"];
const SCHEMA =
  "https://opensource.adobe.com/spectrum-design-data/schemas/v0/icon-set.schema.json";

/** `DragHandle` -> `drag-handle`. */
export const kebab = (name) =>
  name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const attrs = (tag) =>
  Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]),
  );

const num = (v) => String(Number(v));

// Attributes each element may carry. Anything else (style, opacity, clip-rule, stroke,
// transform, a root fill-rule, …) could change the drawing, so it is an error.
const ALLOWED = {
  svg: ["xmlns", "id", "data-name", "width", "height", "viewBox"],
  path: ["id", "data-name", "fill", "fill-rule", "stroke-width", "d"],
  circle: [
    "id",
    "data-name",
    "fill",
    "fill-rule",
    "stroke-width",
    "cx",
    "cy",
    "r",
  ],
};

/**
 * The geometry of one SVG file: its viewBox and every shape as a path (circles become
 * two arcs), keeping each path's fill rule. Throws on anything it cannot keep exactly:
 * other elements or attributes, or fills that are not the icon colour.
 */
export function parseSvg(svg, file) {
  const fail = (why) => {
    throw new Error(`${file}: ${why}`);
  };
  const body = svg
    .replace(/<\?xml[^>]*\?>/, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  const tags = [...body.matchAll(/<\s*([a-zA-Z]+)\b([^>]*)>/g)];
  if (tags[0]?.[1] !== "svg") fail("no <svg> element");
  const paths = [];
  let viewBox;
  for (const [, el, rest] of tags) {
    const a = attrs(rest);
    if (!ALLOWED[el]) fail(`unsupported element <${el}>`);
    const extra = Object.keys(a).filter((k) => !ALLOWED[el].includes(k));
    if (extra.length) fail(`<${el}> has unsupported ${extra.join(", ")}`);
    if (a["stroke-width"] !== undefined && Number(a["stroke-width"]) !== 0)
      fail(`<${el}> has a stroke`);
    if (el === "svg") {
      viewBox = a.viewBox;
      continue;
    }
    if (a.fill === undefined || !/^var\(--iconPrimary\b/.test(a.fill))
      fail(`<${el}> fill ${a.fill ?? "(none)"} is not the icon colour`);
    let d = a.d;
    if (el === "circle") {
      // SVG defaults a missing cx or cy to 0; a circle without a radius draws nothing.
      const [cx, cy, r] = [a.cx ?? 0, a.cy ?? 0, a.r].map(Number);
      if (![cx, cy, r].every(Number.isFinite) || r <= 0)
        fail(`<circle> has no valid cx, cy or r`);
      d = `M${num(cx - r)},${num(cy)}a${num(r)},${num(r)} 0 1 0 ${num(2 * r)},0a${num(r)},${num(r)} 0 1 0 ${num(-2 * r)},0Z`;
    }
    if (!d) fail(`<${el}> has no geometry`);
    paths.push(a["fill-rule"] ? { d, fillRule: a["fill-rule"] } : { d });
  }
  if (!viewBox) fail("no viewBox");
  if (!paths.length) fail("no shapes");
  return { viewBox: viewBox.trim().split(/\s+/).map(num).join(" "), paths };
}

const git = (checkout, ...args) =>
  execFileSync("git", ["-C", checkout, ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

function provenance(sha, path) {
  return {
    repository: "https://github.com/adobe/react-spectrum",
    commit: sha,
    path,
    license: "Apache-2.0",
    copyright: "Copyright 2024 Adobe. All rights reserved.",
    notice:
      "Path data from React Spectrum S2, licensed under the Apache License, Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0). Colour fills were removed; the geometry is unchanged.",
  };
}

/** Builds both icon sets from `read(path)` / `list(dir)` over the source tree. */
export function buildSets({ sha, list, read }) {
  const skipped = [];
  const ui = {};
  for (const file of list(UI_DIR)
    .filter((f) => f.endsWith(".svg"))
    .sort()) {
    const m = file.match(/^S2_([A-Za-z]+)Size(\d+)\.svg$/);
    if (!m) {
      skipped.push({ file, reason: "no Size<scale> suffix" });
      continue;
    }
    const geometry = parseSvg(read(`${UI_DIR}/${file}`), file);
    const icon = (ui[kebab(m[1])] ??= { sizes: {} });
    icon.sizes[m[2]] = { ...geometry, source: file };
  }
  const workflow = {};
  for (const name of WORKFLOW_ICONS) {
    const file = `S2_Icon_${name}_20_N.svg`;
    workflow[kebab(name)] = {
      ...parseSvg(read(`${WORKFLOW_DIR}/${file}`), file),
      source: file,
    };
  }
  const sorted = (o) =>
    Object.fromEntries(
      Object.keys(o)
        .sort()
        .map((k) => [k, o[k]]),
    );
  const set = (name, description, path, icons) => ({
    $schema: SCHEMA,
    set: name,
    description,
    source: provenance(sha, path),
    icons: sorted(icons),
  });
  return {
    skipped,
    sets: {
      ui: set(
        "ui",
        "Spectrum 2 UI icons, one drawing per size. Size keys are the scale index of the icon size tokens (S2_ChevronSize100 is chevron at 100).",
        UI_DIR,
        ui,
      ),
      workflow: set(
        "workflow",
        "A few Spectrum 2 workflow icons for demos, drawn at 20 px. Add is the default.",
        WORKFLOW_DIR,
        workflow,
      ),
    },
  };
}

/** Icon ids with no `icon-terms` registry entry (id or alias). */
export function unregistered(sets, registry) {
  const known = new Set(
    registry.values.flatMap((v) => [v.id, ...(v.aliases ?? [])]),
  );
  return Object.values(sets).flatMap((s) =>
    Object.keys(s.icons)
      .filter((id) => !known.has(id))
      .map((id) => `${s.set}:${id}`),
  );
}

function main([checkout, sha]) {
  if (!checkout || !/^[0-9a-f]{40}$/.test(sha ?? ""))
    throw new Error(
      "usage: node scripts/import-icons.mjs <react-spectrum checkout> <full 40-character sha>",
    );
  const here = dirname(fileURLToPath(import.meta.url));
  const { sets, skipped } = buildSets({
    sha,
    list: (dir) =>
      git(checkout, "ls-tree", "--name-only", `${sha}:${dir}`)
        .split("\n")
        .filter(Boolean),
    read: (path) => git(checkout, "show", `${sha}:${path}`),
  });
  for (const [name, data] of Object.entries(sets))
    writeFileSync(
      join(here, `../icons/${name}.json`),
      JSON.stringify(data, null, 2) + "\n",
    );
  const registry = JSON.parse(
    readFileSync(join(here, "../registry/icon-terms.json"), "utf8"),
  );
  for (const [name, data] of Object.entries(sets))
    console.log(`${name}: ${Object.keys(data.icons).length} icons`);
  for (const s of skipped) console.log(`skipped ${s.file}: ${s.reason}`);
  const missing = unregistered(sets, registry);
  if (missing.length)
    console.log(`no icon-terms registry entry: ${missing.join(", ")}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main(process.argv.slice(2));
