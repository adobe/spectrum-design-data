// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// The request matrix shared by the Node byte-equality test and the browser parity test:
// sites built with the CLI, the states to render, and `design-data render --batch` output.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../../..", import.meta.url));
export const cli =
  process.env.DESIGN_DATA_CLI ?? join(root, "sdk/target/debug/design-data");
export const json = (file) => JSON.parse(readFileSync(file, "utf8"));
export const run = (...args) =>
  execFileSync(cli, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

const defaultTable = json(
  join(root, "sdk/core/src/text-metrics/source-sans-3.json"),
);
const uiIcons = json(join(root, "packages/design-data/icons/ui.json")).icons;

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
// button-ios and switch-ios (the site entries named `button` and `switch`).
export const PLATFORMS = { foundation: COMPONENTS, ios: ["button", "switch"] };

// A table with every advance 15% wider, to prove a request's own table is honoured.
export const wide = structuredClone(defaultTable);
for (const w of Object.values(wide))
  if (w.adv) w.adv = w.adv.map((a) => Math.round(a * 1.15));

export const variantFile = (key) => `${key.replaceAll("|", "-")}.json`;

/** Build one site per platform under `dir`; `engine` (a pkg/web dir) is copied when given. */
export function buildSites(dir, engine) {
  const sites = {};
  for (const platform of Object.keys(PLATFORMS)) {
    const out = join(dir, `site-${platform}`);
    run(
      "site",
      ...(platform === "foundation" ? [] : ["--platform", platform]),
      ...(engine ? ["--engine", engine] : ["--data-only"]),
      "--out",
      out,
    );
    sites[platform] = { out, compiled: json(join(out, "data.json")).compiled };
  }
  return sites;
}

export const readVariant = (sites, platform, site, key) =>
  readFileSync(
    join(sites[platform].out, "variants", site, variantFile(key)),
    "utf8",
  );

/** The whole compiled recipe (every variant) rebuilt from its variant files. */
export function assemble(sites, platform, site) {
  const { variants: keys, ...meta } = sites[platform].compiled[site];
  const c = { ...meta, variants: {}, drawings: {} };
  for (const key of keys) {
    const v = JSON.parse(readVariant(sites, platform, site, key));
    c.variants[key] = v.parts;
    Object.assign(c.drawings, v.drawings);
  }
  return c;
}

export const variantKey = (s) =>
  `${s.request.size}|${s.request.mode.colorScheme}|${s.request.mode.scale}`;

export function buildStates(sites) {
  const out = [];
  for (const [platform, names] of Object.entries(PLATFORMS)) {
    for (const site of names) {
      const c = sites[platform].compiled[site];
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
      for (const width of [40, 300])
        add(`width-${width}`, mid, "light", "desktop", { request: { width } });
      for (const state of ["hover", "down", "keyboard-focus"])
        add(state, mid, "light", "desktop", { request: { states: [state] } });
      for (const [name, value] of Object.entries(c.optionDefaults))
        if (typeof value === "boolean")
          add(`opt-${name}`, mid, "light", "desktop", {
            request: { options: { [name]: !value } },
          });
      if (c.content.icon) {
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

export const requestFor = (s, component) => ({
  component,
  ...s.request,
  ...(s.metrics ? { textMetrics: s.metrics } : {}),
});

/** `design-data render --batch` over `states`: id -> { component, svg, scene }. */
export function cliRender(dir, states) {
  const widePath = join(dir, "wide.json");
  writeFileSync(widePath, JSON.stringify(wide));
  const out = new Map();
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
      width: s.request.width,
      icon: s.request.icon,
    }));
    const file = join(dir, `${name}-batch.json`);
    const outDir = join(dir, `${name}-out`);
    writeFileSync(file, JSON.stringify(batch));
    run("render", "--batch", file, "--out", outDir, ...args);
    for (const e of json(join(outDir, "index.json")).states) {
      if (e.error) throw new Error(`${e.id}: ${e.error}`);
      out.set(e.id, {
        component: e.component,
        svg: readFileSync(join(outDir, e.svg), "utf8"),
        scene: json(join(outDir, e.scene)),
      });
    }
  }
  return out;
}
