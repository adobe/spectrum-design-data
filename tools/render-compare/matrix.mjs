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
import { createHash } from "node:crypto";
import { join } from "node:path";

export const LONG =
  "A much longer text that should wrap across several lines in the component";
const TEXTS = ["", "W", "Short", LONG, "Ünï ✓ 日本"];
const ICON = { set: "workflow", name: "edit" };
const MODES = [
  ["light", "desktop"],
  ["dark", "mobile"],
  ["wireframe", "desktop"],
];
const SCHEMES = ["light", "dark", "wireframe"];
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
const UNSET = Symbol("unset");

/** One array item built from the item schema: strings get numbered text, booleans their default. */
function item(schema, i, flip) {
  const props = schema?.properties;
  if (!props) return `Item ${i + 1}`;
  const o = {};
  for (const [k, p] of Object.entries(props)) {
    if (p.type === "boolean")
      o[k] = flip ? !(p.default ?? false) : (p.default ?? false);
    else if (p.type === "string")
      o[k] = `${k === "label" ? "Item" : k} ${i + 1}`;
    else if (p.type === "number" || p.type === "integer") o[k] = i + 1;
  }
  return o;
}

/** The candidate values of one option, or null when the option is not drawn by value. */
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
    case "array":
      return [0, 1, 3, 7].map((n, k) =>
        Array.from({ length: n }, (_, i) =>
          item(o.items, i, k === 3 && i === 1),
        ),
      );
    default:
      return null;
  }
}

const isIcon = (key, o) => key === "icon" || /icon/i.test(o.$ref ?? "");

/** Single-factor cases: every size x scheme x scale x state set, label values, then each option value alone, icons. */
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
            .filter((x) => x.length === 1)
            .slice(0, 4)
            .concat([[]]))
            add({ size, states: s, options: { [key]: v }, colorScheme, scale });
          for (const label of ["", LONG, "W"])
            add({ size, options: { [key]: v }, colorScheme, scale, label });
        }
  }
  return cases;
}

/** The parameters of the pairwise cover: each option (with an unset value), the state sets and the icon. */
export function paramsOf({ options, states }) {
  const params = new Map();
  const put = (name, kind, values) => {
    const cur = params.get(name) ?? { name, kind, values: [] };
    for (const v of values)
      if (!cur.values.some((x) => valueKey(x) === valueKey(v)))
        cur.values.push(v);
    params.set(name, cur);
  };
  for (const [key, o] of Object.entries(options)) {
    if (key === "size") continue;
    if (isIcon(key, o)) continue;
    const vals = candidates(o);
    if (!vals) continue;
    const text = o.type === "string" && !optionValues(o).length;
    put(key, "option", [UNSET, ...(text ? ["", "W", LONG] : vals).slice(0, 8)]);
  }
  const sets = [[], ...states.map((s) => [s])];
  if (states.includes("hover") && states.includes("down"))
    sets.push(["hover", "down"]);
  if (sets.length > 1) put("$states", "states", sets);
  if (Object.values(options).some((o, i) => isIcon(Object.keys(options)[i], o)))
    put("$icon", "icon", [UNSET, ICON, "none"]);
  return params;
}

const valueKey = (v) => (v === UNSET ? "\u0000unset" : JSON.stringify(v));

/** Merge the parameters of several trees (a value added by the PR stays in the cover). */
export function mergeParams(list) {
  const out = new Map();
  for (const m of list) {
    if (!m) continue;
    for (const p of m.values()) {
      const cur = out.get(p.name) ?? { ...p, values: [] };
      for (const v of p.values)
        if (!cur.values.some((x) => valueKey(x) === valueKey(v)))
          cur.values.push(v);
      out.set(p.name, cur);
    }
  }
  return [...out.values()].filter((p) => p.values.length > 1);
}

/** Greedy all-pairs: every pair of values of any two parameters appears in at least one case. */
export function pairwise(params) {
  const need = new Set();
  const pk = (i, a, j, b) => `${i}:${a}|${j}:${b}`;
  const ks = params.map((p) => p.values.map(valueKey));
  for (let i = 0; i < params.length; i++)
    for (let j = i + 1; j < params.length; j++)
      for (const a of ks[i]) for (const b of ks[j]) need.add(pk(i, a, j, b));
  const rows = [];
  while (need.size) {
    const [first] = need;
    const [li, ri] = first.split("|");
    const [i, a] = [Number(li.split(":")[0]), li.slice(li.indexOf(":") + 1)];
    const [j, b] = [Number(ri.split(":")[0]), ri.slice(ri.indexOf(":") + 1)];
    const row = new Array(params.length).fill(null);
    row[i] = a;
    row[j] = b;
    for (let k = 0; k < params.length; k++) {
      if (row[k] !== null) continue;
      let best = ks[k][0];
      let bestGain = -1;
      for (const v of ks[k]) {
        let gain = 0;
        for (let m = 0; m < params.length; m++) {
          if (row[m] === null || m === k) continue;
          if (
            m < k
              ? need.has(pk(m, row[m], k, v))
              : need.has(pk(k, v, m, row[m]))
          )
            gain++;
        }
        if (gain > bestGain) {
          bestGain = gain;
          best = v;
        }
      }
      row[k] = best;
    }
    for (let x = 0; x < params.length; x++)
      for (let y = x + 1; y < params.length; y++)
        need.delete(pk(x, row[x], y, row[y]));
    rows.push(row);
  }
  return rows.map((r) => r.map((k, i) => params[i].values[ks[i].indexOf(k)]));
}

/** Pairs of parameter values that the cases cover, and the total, over the same parameters. */
export function pairCoverage(params, cases) {
  let total = 0;
  for (let i = 0; i < params.length; i++)
    for (let j = i + 1; j < params.length; j++)
      total += params[i].values.length * params[j].values.length;
  const seen = new Set();
  for (const c of cases) {
    if (c.options === undefined) continue;
    const vals = params.map((p) => {
      if (p.kind === "states") return valueKey(c.states);
      if (p.kind === "icon") return valueKey(c.icon ?? UNSET);
      return valueKey(p.name in c.options ? c.options[p.name] : UNSET);
    });
    for (let i = 0; i < params.length; i++)
      for (let j = i + 1; j < params.length; j++)
        seen.add(`${i}:${vals[i]}|${j}:${vals[j]}`);
  }
  let covered = 0;
  for (let i = 0; i < params.length; i++)
    for (let j = i + 1; j < params.length; j++)
      for (const a of params[i].values)
        for (const b of params[j].values)
          if (seen.has(`${i}:${valueKey(a)}|${j}:${valueKey(b)}`)) covered++;
  return { total, covered };
}

/** Pairwise rows as cases, with size and mode rotated so each pair is drawn once at some size and mode. */
function pairCases(name, params, sizes) {
  const midSize = sizes.includes("m") ? "m" : sizes[sizes.length - 1];
  const edge = [...new Set([sizes[0], midSize, sizes[sizes.length - 1]])];
  const toCase = (row, n) => {
    const c = {
      component: name,
      size: edge[n % edge.length],
      states: [],
      options: {},
      colorScheme: MODES[n % MODES.length][0],
      scale: MODES[n % MODES.length][1],
      label: "Label",
    };
    params.forEach((p, i) => {
      const v = row[i];
      if (p.kind === "states") c.states = v;
      else if (p.kind === "icon") {
        if (v !== UNSET) c.icon = v;
      } else if (v !== UNSET) c.options[p.name] = v;
    });
    return c;
  };
  const rows = pairwise(params).map(toCase);
  // all-first and all-true combinations
  const opts = params.filter((p) => p.kind === "option");
  const n = rows.length;
  rows.push(
    toCase(
      params.map((p) =>
        p.kind === "option" ? (p.values[1] ?? p.values[0]) : p.values[0],
      ),
      n,
    ),
  );
  rows.push(
    toCase(
      params.map((p) =>
        p.kind === "option" && p.values.includes(true) ? true : p.values[0],
      ),
      n + 1,
    ),
  );
  rows.push(
    toCase(
      params.map((p) =>
        p.kind === "option" ? p.values[p.values.length - 1] : p.values[0],
      ),
      n + 2,
    ),
  );
  return opts.length ? rows : [];
}

const keyOf = (c) => JSON.stringify(c);

/** Union of the cases built from both trees (single factor and pairwise), deduplicated and numbered. */
export function matrixFor(name, trees) {
  const seen = new Set();
  const out = [];
  const push = (c) => {
    const k = keyOf(c);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(c);
  };
  const live = trees.filter(Boolean);
  for (const tree of live) for (const c of buildCases(name, tree)) push(c);
  const params = mergeParams(live.map(paramsOf));
  const sizes = [...new Set(live.flatMap((t) => t.sizes))];
  if (params.length) for (const c of pairCases(name, params, sizes)) push(c);
  const cases = out.map((c, i) => ({
    id: `${name}-${String(i).padStart(5, "0")}`,
    ...c,
  }));
  return { cases, params };
}

/** Keeps about 1/step of the cases: a seeded hash of the case decides, so no option family aliases away. */
export function sample(cases, step, seed = 0) {
  if (!step || step <= 1) return cases;
  return cases.filter(
    (c) =>
      createHash("sha1")
        .update(`${seed}:${keyOf({ ...c, id: undefined })}`)
        .digest()
        .readUInt32BE(0) %
        step ===
      0,
  );
}

/** n items spread evenly over a list. */
export function spread(items, n) {
  if (items.length <= n) return items;
  const step = items.length / n;
  return Array.from({ length: n }, (_, i) => items[Math.floor(i * step)]);
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
