// Copyright 2026 Adobe. All rights reserved.

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "ava";
import { Dataset } from "../pkg/node/design_data_wasm.js";
import {
  renderScene,
  renderSvg,
} from "../../plugins/site/assets/visual-runtime.js";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
// `moon run sdk-wasm:site-data` prebuilds data.json (cached by moon) and sets
// VISUAL_PARITY_SITE_DIR; otherwise build the site here.
const prebuilt = process.env.VISUAL_PARITY_SITE_DIR;
let out = prebuilt;
if (!prebuilt || !existsSync(join(prebuilt, "data.json"))) {
  const bin = join(repo, "sdk/target/debug/design-data");
  out = mkdtempSync(join(tmpdir(), "site-"));
  const cli = existsSync(bin)
    ? [bin, ["site", "--out", out]]
    : [
        "cargo",
        ["run", "-q", "-p", "design-data-cli", "--", "site", "--out", out],
      ];
  execFileSync(cli[0], cli[1], { cwd: repo, stdio: "pipe" });
}

const data = JSON.parse(readFileSync(join(out, "data.json"), "utf8"));
const readJson = (path) => JSON.parse(readFileSync(join(repo, path), "utf8"));
const load = (component) => ({
  component,
  compiled: data.compiled[component],
  recipe: readJson(`packages/design-data/visuals/${component}.json`),
  schema: readJson(`packages/design-data/components/${component}.json`),
});
const subjects = readdirSync(join(repo, "packages/design-data/visuals"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.slice(0, -".json".length))
  .sort()
  .map(load);

const close = (a, b, path = "") => {
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < 1e-9 || `${path}: ${a} !== ${b}`;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const r = close(a[k], b[k], `${path}.${k}`);
      if (r !== true) return r;
    }
    return true;
  }
  return a === b || `${path}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`;
};

const FULL = process.env.VISUAL_PARITY_FULL === "1";
const RANDOM_SAMPLE = 8;
const schemes = ["light", "dark", "wireframe"];
const scales = ["desktop", "mobile"];

// Option axes come from the component data: booleans are false/true, enums are
// every declared value plus unset. Free-form options (label, icon, size, ...)
// are not enumerable and are covered by extraCases instead.
const axesFor = ({ options }) =>
  Object.entries(options)
    .filter(([name]) => name !== "size")
    .flatMap(([name, def]) => {
      if (def.type === "boolean") return [[name, [false, true]]];
      if (def.type === "string" && def.values?.length) {
        return [[name, [undefined, ...def.values.map((v) => v.value)]]];
      }
      return [];
    });

const product = (axes) =>
  axes.reduce(
    (sets, [name, values]) =>
      sets.flatMap((set) =>
        values.map((v) => (v === undefined ? set : { ...set, [name]: v })),
      ),
    [{}],
  );

const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const sampleOptionSets = (axes) => {
  const sets = new Map();
  const add = (o) => sets.set(JSON.stringify(o), o);
  add({});
  for (const [name, values] of axes) {
    for (const v of values) if (v !== undefined) add({ [name]: v });
  }
  const rand = mulberry32(0x5eed);
  for (let i = 0; i < RANDOM_SAMPLE; i++) {
    const o = {};
    for (const [name, values] of axes) {
      const v = values[Math.floor(rand() * values.length)];
      if (v !== undefined) o[name] = v;
    }
    add(o);
  }
  return [...sets.values()];
};

const stateSetsFor = ({ states = [] }) => [
  [],
  ...states.filter((s) => s.name !== "disabled").map((s) => [s.name]),
];

// Specific behaviors that must always run, whatever the sample draws.
const extraCases = {
  badge: [
    { variant: "informative", style: "outline", icon: true },
    { variant: "fuchsia", style: "outline", fixed: "top", icon: true },
    { variant: "notice", fixed: "bottom", label: false, icon: true },
  ],
  checkbox: [
    { label: false, isSelected: true },
    { isIndeterminate: true, isDisabled: true, isError: true },
  ],
  switch: [
    { isSelected: true, isEmphasized: true, isDisabled: true },
    { hideLabel: true, isSelected: true },
  ],
  "action-button": [{ hasHoldIcon: true, hideLabel: true, isQuiet: true }],
};

const firstDiff = (a, b) => {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return i;
};

for (const { component, compiled, recipe, schema } of subjects) {
  test(`${component}: JS runtime SVG matches the WASM renderer (${FULL ? "full matrix" : "sample"})`, (t) => {
    t.truthy(compiled, `${component}: no compiled entry in site data.json`);
    const axes = axesFor(schema);
    const optionSets = FULL ? product(axes) : sampleOptionSets(axes);
    const seen = new Set(optionSets.map((o) => JSON.stringify(o)));
    for (const o of extraCases[component] ?? []) {
      if (!seen.has(JSON.stringify(o))) optionSets.push(o);
    }
    const stateSets = stateSetsFor(schema);
    const sizes = Object.keys(compiled.sizeScale);
    const ds = Dataset.embedded();
    let n = 0;
    try {
      for (const size of sizes) {
        for (const colorScheme of schemes) {
          for (const scale of scales) {
            for (const states of stateSets) {
              for (const options of optionSets) {
                const req = {
                  component,
                  size,
                  states,
                  options,
                  mode: { colorScheme, scale },
                  label: "Label",
                };
                const expected = ds.renderSvg(recipe, req);
                const scene = renderScene(compiled, req);
                const actual = renderSvg(scene);
                n++;
                if (actual !== expected) {
                  const at = firstDiff(actual, expected);
                  const sceneDiff = close(
                    scene,
                    JSON.parse(ds.renderScene(recipe, req)),
                  );
                  return t.fail(
                    `component=${component} size=${size} scheme=${colorScheme} scale=${scale}\n` +
                      `states=${JSON.stringify(states)} options=${JSON.stringify(options)}\n` +
                      `first differing offset: ${at}\n` +
                      `js:   ${JSON.stringify(actual.slice(Math.max(0, at - 40), at + 80))}\n` +
                      `wasm: ${JSON.stringify(expected.slice(Math.max(0, at - 40), at + 80))}\n` +
                      `scene diff: ${sceneDiff === true ? "none" : sceneDiff}`,
                  );
                }
              }
            }
          }
        }
      }
    } finally {
      ds.free();
    }
    t.log(`${component}: ${n} renders, 0 differences`);
    t.true(n > 0);
  });
}

// Golden scenes: checked-in SVGs so a change that alters both engines the same
// way still shows up as a reviewable diff. Regenerate with VISUAL_PARITY_UPDATE=1.
const goldenDir = join(repo, "sdk/wasm/test/fixtures/visual-golden");
const goldenScenes = ({ options, states = [] }, compiled) => {
  const names = Object.keys(options).filter((n) => n !== "size");
  const pick = (fn) =>
    Object.fromEntries(
      names.flatMap((n) => {
        const v = fn(options[n]);
        return v === undefined ? [] : [[n, v]];
      }),
    );
  const bools = (def) => (def.type === "boolean" ? true : undefined);
  const enumAt = (i) => (def) => {
    const vs = def.values?.map((v) => v.value);
    return vs?.length ? vs.at(i) : undefined;
  };
  const size = options.size?.default ?? Object.keys(compiled.sizeScale)[0];
  const state = states.find((s) => s.name !== "disabled")?.name;
  const base = { size, label: "Label" };
  return {
    default: {
      ...base,
      states: [],
      options: {},
      mode: { colorScheme: "light", scale: "desktop" },
    },
    "all-on-dark-mobile": {
      ...base,
      states: state ? [state] : [],
      options: { ...pick(enumAt(-1)), ...pick(bools) },
      mode: { colorScheme: "dark", scale: "mobile" },
    },
    "first-values-wireframe": {
      ...base,
      states: [],
      options: pick(enumAt(0)),
      mode: { colorScheme: "wireframe", scale: "desktop" },
    },
  };
};

for (const { component, compiled, recipe, schema } of subjects) {
  test(`${component}: both engines match the checked-in golden SVGs`, (t) => {
    const ds = Dataset.embedded();
    try {
      for (const [name, scene] of Object.entries(
        goldenScenes(schema, compiled),
      )) {
        const req = { component, ...scene };
        const file = join(goldenDir, component, `${name}.svg`);
        const wasm = ds.renderSvg(recipe, req);
        if (process.env.VISUAL_PARITY_UPDATE === "1") {
          mkdirSync(join(goldenDir, component), { recursive: true });
          writeFileSync(file, wasm);
        }
        t.true(
          existsSync(file),
          `missing golden ${component}/${name}.svg; run with VISUAL_PARITY_UPDATE=1`,
        );
        const golden = readFileSync(file, "utf8");
        t.is(wasm, golden, `wasm drifted from golden ${component}/${name}`);
        t.is(
          renderSvg(renderScene(compiled, req)),
          golden,
          `js drifted from golden ${component}/${name}`,
        );
      }
    } finally {
      ds.free();
    }
  });
}
