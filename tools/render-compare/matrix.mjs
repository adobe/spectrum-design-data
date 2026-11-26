// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// The option x state matrix for `render --batch`, generated from a component's data.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const LONG =
  "A much longer text that should wrap across several lines in the component";
const TEXTS = ["", "W", "Short", LONG, "Ünï ✓ 日本"];
const ICON = { set: "workflow", name: "edit" };
const MODES = [
  ["light", "desktop"],
  ["dark", "mobile"],
];
const SCHEMES = ["light", "dark"];
const SCALES = ["desktop", "mobile"];

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

/** The inputs the matrix needs from one data tree: visuals sizeScale and component options and states. */
export function readComponent(dataDir, name) {
  const visual = join(dataDir, "visuals", `${name}.json`);
  const comp = join(dataDir, "components", `${name}.json`);
  if (!existsSync(visual) || !existsSync(comp)) return null;
  const v = readJson(visual);
  const c = readJson(comp);
  return {
    sizes: Object.keys(v.sizeScale ?? {}).length
      ? Object.keys(v.sizeScale)
      : ["m"],
    options: c.options ?? {},
    states: (c.states ?? []).map((s) => s.name),
  };
}

const optionValues = (o) =>
  (o.values ?? []).map((v) => (v && typeof v === "object" ? v.value : v));

/** The candidate values of one option, or null when the option is not drawn by value (arrays, objects, icons). */
function candidates(o) {
  const vals = optionValues(o);
  switch (o.type) {
    case "boolean":
      return [true, false];
    case "string":
      return vals.length ? vals : TEXTS.slice(1);
    case "number":
    case "integer": {
      if (vals.length) return vals;
      const lo = o.minimum ?? 0;
      const hi = o.maximum ?? 10;
      return [...new Set([lo, Math.min(lo + 1, hi), hi])];
    }
    default:
      return null;
  }
}

const isIcon = (key, o) => key === "icon" || /icon/i.test(o.$ref ?? "");

/** Every case for one component. Each case is a `render --batch` state without its id. */
export function buildCases(name, { sizes, options, states }) {
  const cases = [];
  const add = (c) =>
    cases.push({
      component: name,
      size: "m",
      states: [],
      options: {},
      colorScheme: "light",
      scale: "desktop",
      label: "Label",
      ...c,
    });
  const sets = [[], ...states.map((s) => [s])];
  if (states.includes("hover") && states.includes("down"))
    sets.push(["hover", "down"]);
  const midSize = sizes.includes("m") ? "m" : sizes[sizes.length - 1];
  const edgeSizes = [...new Set([sizes[0], midSize, sizes[sizes.length - 1]])];

  for (const size of sizes)
    for (const colorScheme of SCHEMES)
      for (const scale of SCALES) {
        for (const s of sets) add({ size, states: s, colorScheme, scale });
        for (const label of TEXTS) add({ size, colorScheme, scale, label });
      }

  const entries = Object.entries(options).filter(([k]) => k !== "size");
  for (const [key, o] of entries) {
    if (isIcon(key, o)) {
      for (const size of edgeSizes)
        for (const [colorScheme, scale] of MODES) {
          add({ size, colorScheme, scale, icon: ICON });
          add({ size, colorScheme, scale, icon: "none" });
          add({ size, colorScheme, scale, icon: ICON, label: "" });
        }
      continue;
    }
    const vals = candidates(o);
    if (!vals) continue;
    const text = o.type === "string" && !optionValues(o).length;
    const values = text ? [...new Set([...TEXTS, ...vals])] : vals;
    for (const v of values)
      for (const size of edgeSizes)
        for (const [colorScheme, scale] of MODES) {
          for (const s of sets
            .slice(0, 1)
            .concat(sets.filter((x) => x.length === 1).slice(0, 4)))
            add({ size, states: s, options: { [key]: v }, colorScheme, scale });
          add({ size, options: { [key]: v }, colorScheme, scale, label: "" });
          add({ size, options: { [key]: v }, colorScheme, scale, label: LONG });
          add({ size, options: { [key]: v }, colorScheme, scale, label: "W" });
        }
  }

  const bools = entries
    .filter(([, o]) => o.type === "boolean")
    .map(([k]) => k)
    .slice(0, 6);
  for (let i = 0; i < bools.length; i++)
    for (let j = i + 1; j < bools.length; j++)
      for (const a of [true, false])
        for (const b of [true, false])
          add({ options: { [bools[i]]: a, [bools[j]]: b } });

  return cases;
}

const keyOf = (c) => JSON.stringify(c, Object.keys(c).sort());

/** Union of the cases built from both trees, deduplicated and numbered. Missing trees are skipped. */
export function matrixFor(name, trees) {
  const seen = new Set();
  const out = [];
  for (const tree of trees) {
    if (!tree) continue;
    for (const c of buildCases(name, tree)) {
      const k = keyOf(c);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(c);
    }
  }
  return out.map((c, i) => ({
    id: `${name}-${String(i).padStart(5, "0")}`,
    ...c,
  }));
}

/** Every `step`-th case starting at `seed % step`; step 1 keeps all. */
export function sample(cases, step, seed = 0) {
  if (!step || step <= 1) return cases;
  const off = seed % step;
  return cases.filter((_, i) => i % step === off);
}

/** The `render` flags for one case (PNG goes through the single-render path). */
export function renderArgs(c) {
  const a = [
    c.component,
    "--size",
    c.size,
    "--color-scheme",
    c.colorScheme,
    "--scale",
    c.scale,
    "--label",
    c.label,
  ];
  for (const s of c.states) a.push("--state", s);
  for (const [k, v] of Object.entries(c.options))
    a.push("--option", `${k}=${JSON.stringify(v)}`);
  if (c.icon)
    a.push(
      "--icon",
      typeof c.icon === "string" ? c.icon : `${c.icon.set}:${c.icon.name}`,
    );
  return a;
}
