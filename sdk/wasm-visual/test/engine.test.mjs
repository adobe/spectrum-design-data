// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Byte equality: Engine.svg (and scene) over one precompiled variant equals `design-data
// render` for a matrix of requests. Needs the CLI (default sdk/target/debug/design-data, or
// DESIGN_DATA_CLI) and `node scripts/build.mjs`; run with `node --test test/`.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const cli =
  process.env.DESIGN_DATA_CLI ?? join(root, "sdk/target/debug/design-data");
const { Engine } = createRequire(import.meta.url)(
  "../pkg/node/design_data_wasm_visual.js",
);
const defaultTable = JSON.parse(
  readFileSync(join(root, "sdk/core/src/text-metrics/source-sans-3.json")),
);
const uiIcons = JSON.parse(
  readFileSync(join(root, "packages/design-data/icons/ui.json")),
).icons;

const run = (...args) =>
  execFileSync(cli, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
const json = (file) => JSON.parse(readFileSync(file, "utf8"));

const COMPONENTS = [
  "button",
  "badge",
  "switch",
  "checkbox",
  "radio-button",
  "accordion",
  "action-button",
];
// toggle-button-ios has a component entry but no visual recipe yet, so the iOS build has
// button-ios and switch-ios (the compiled entries named `button` and `switch`).
const PLATFORMS = { foundation: COMPONENTS, ios: ["button", "switch"] };

const dir = mkdtempSync(join(tmpdir(), "slim-engine-"));
let compiled; // platform -> site component name -> compiled recipe
let states; // [{ id, platform, site, request }]

// A table with every advance 15% wider, to prove a request's own table is honoured.
const wide = structuredClone(defaultTable);
for (const w of Object.values(wide))
  if (w.adv) w.adv = w.adv.map((a) => Math.round(a * 1.15));
const widePath = join(dir, "wide.json");

function variantDoc(c, key) {
  return JSON.stringify({
    root: c.root,
    optionDefaults: c.optionDefaults,
    parts: c.variants[key],
    drawings: c.drawings,
  });
}

function buildStates() {
  const out = [];
  for (const [platform, names] of Object.entries(PLATFORMS)) {
    for (const site of names) {
      const c = compiled[platform][site];
      const sizes = Object.keys(c.sizeScale);
      const mid = sizes[Math.floor(sizes.length / 2)];
      const add = (tag, size, scheme, scale, extra = {}) =>
        out.push({
          id: `${platform}-${site}-${size}-${scheme}-${scale}-${tag}`,
          platform,
          site,
          metrics: extra.metrics,
          request: {
            size,
            states: [],
            options: {},
            mode: { colorScheme: scheme, scale },
            label: "Label",
            ...extra.request,
          },
        });
      for (const size of sizes)
        for (const scheme of ["light", "dark"])
          for (const scale of ["desktop", "mobile"])
            add("default", size, scheme, scale);
      add("label", mid, "light", "desktop", {
        request: { label: "A much longer custom label than the default" },
      });
      add("nolabel", mid, "dark", "mobile", { request: { label: "" } });
      for (const state of ["hover", "down", "keyboard-focus"])
        add(state, mid, "light", "desktop", { request: { states: [state] } });
      for (const [name, value] of Object.entries(c.optionDefaults))
        if (typeof value === "boolean")
          add(`opt-${name}`, mid, "light", "desktop", {
            request: { options: { [name]: !value } },
          });
      if (
        Object.values(c.variants[`${mid}|light|desktop`]).some(
          (p) => p.icon?.content,
        )
      ) {
        const first = Object.keys(uiIcons)[0];
        const icons = {
          edit: { set: "workflow", name: "edit" },
          none: "none",
          unknown: { set: "workflow", name: "nope" },
          ui: { set: "ui", name: first },
        };
        for (const [tag, icon] of Object.entries(icons))
          for (const size of sizes)
            add(`icon-${tag}`, size, "light", "desktop", { request: { icon } });
      }
      add("metrics", mid, "light", "desktop", {
        request: { label: "Custom metrics" },
        metrics: wide,
      });
    }
  }
  return out;
}

const request = (s, component) => ({
  component,
  ...s.request,
  ...(s.metrics ? { textMetrics: s.metrics } : {}),
});

describe("Engine equals design-data render", () => {
  let cliOut; // id -> { svg, scene, component }

  before(() => {
    compiled = {};
    for (const platform of Object.keys(PLATFORMS)) {
      const out = join(dir, `site-${platform}`);
      run(
        "site",
        ...(platform === "foundation" ? [] : ["--platform", platform]),
        "--out",
        out,
      );
      compiled[platform] = json(join(out, "data.json")).compiled;
    }
    writeFileSync(widePath, JSON.stringify(wide));
    states = buildStates();
    cliOut = new Map();
    for (const [name, pick, args] of [
      ["default", (s) => !s.metrics, []],
      ["wide", (s) => s.metrics, ["--text-metrics", widePath]],
    ]) {
      const batch = states.filter(pick).map((s) => ({
        id: s.id,
        component: s.site,
        platform: s.platform === "foundation" ? undefined : s.platform,
        size: s.request.size,
        states: s.request.states,
        options: s.request.options,
        colorScheme: s.request.mode.colorScheme,
        scale: s.request.mode.scale,
        label: s.request.label,
        icon: s.request.icon,
      }));
      const file = join(dir, `${name}-batch.json`);
      const outDir = join(dir, `${name}-out`);
      writeFileSync(file, JSON.stringify(batch));
      run("render", "--batch", file, "--out", outDir, ...args);
      for (const e of json(join(outDir, "index.json")).states) {
        assert.equal(e.error, undefined, `${e.id}: ${e.error}`);
        cliOut.set(e.id, {
          component: e.component,
          svg: readFileSync(join(outDir, e.svg), "utf8"),
          scene: json(join(outDir, e.scene)),
        });
      }
    }
  });

  it("covers the whole matrix", () => {
    assert.ok(states.length > 250, `${states.length} states`);
    for (const platform of Object.keys(PLATFORMS))
      for (const site of PLATFORMS[platform])
        assert.ok(
          states.some((s) => s.platform === platform && s.site === site),
        );
    assert.ok(states.some((s) => s.request.icon === "none"));
    assert.ok(states.some((s) => s.metrics));
  });

  it("svg and scene match the CLI byte for byte, from a variant or a whole recipe", () => {
    for (const s of states) {
      const want = cliOut.get(s.id);
      const c = compiled[s.platform][s.site];
      const key = `${s.request.size}|${s.request.mode.colorScheme}|${s.request.mode.scale}`;
      const req = JSON.stringify(request(s, want.component));
      for (const [how, engine] of [
        ["new", new Engine(variantDoc(c, key))],
        ["fromCompiled", Engine.fromCompiled(JSON.stringify(c), key)],
      ]) {
        assert.equal(engine.svg(req), want.svg, `${s.id} (${how})`);
        assert.deepEqual(
          JSON.parse(engine.scene(req)),
          want.scene,
          `${s.id} scene (${how})`,
        );
        engine.free();
      }
    }
  });

  it("anchors on the single `render` command", () => {
    const file = join(dir, "single.svg");
    run(
      "render",
      "--platform",
      "ios",
      "button",
      "--size",
      "m",
      "--icon",
      "workflow:edit",
      "--output",
      file,
    );
    assert.equal(
      readFileSync(file, "utf8"),
      cliOut.get("ios-button-m-light-desktop-icon-edit").svg,
    );
  });

  it("applies the icon override in solve", () => {
    const svg = (tag) =>
      cliOut.get(`foundation-button-m-light-desktop-${tag}`).svg;
    assert.notEqual(svg("icon-edit"), svg("default"));
    assert.notEqual(svg("icon-none"), svg("default"));
    const miss = cliOut.get(
      "foundation-button-m-light-desktop-icon-unknown",
    ).scene;
    assert.deepEqual(miss.diagnostics, [
      "icon workflow:nope has no drawing for size 'm'; drawing a placeholder",
    ]);
  });

  it("rejects an unknown variant key and a malformed variant", () => {
    const c = compiled.foundation.button;
    assert.throws(() =>
      Engine.fromCompiled(JSON.stringify(c), "zz|light|desktop"),
    );
    assert.throws(() => new Engine("{}"));
  });
});
