// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Client-side backend: data.json holds the component list, option and recipe summaries,
// icons and Figma names; each size/mode variant of a recipe is its own file under
// variants/, fetched when first drawn. The slim engine (engine/, the Rust solver compiled to
// WASM) lays it out. No server; all URLs are relative so the site works under any base path.
// Nothing loads at import time, so a failed fetch surfaces as a rejection the page shows.

import { iconRequest } from "./content-controls.js";

const json = async (path) => {
  const r = await fetch(new URL(path, import.meta.url));
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
};
const once = (load) => {
  let p;
  return () => (p ??= load());
};

let data;
const loadData = once(async () => (data = await json("./data.json")));

// The text-measurement table the CLI used when it wrote this site (a `--text-metrics` file or
// the committed default), sent with every request so labels measure the same here as in
// `design-data render`. Kept as text: it is spliced into the request JSON, not re-serialized.
const loadMetrics = once(async () => {
  const r = await fetch(new URL("./text-metrics.json", import.meta.url));
  if (!r.ok) throw new Error(`text-metrics.json: HTTP ${r.status}`);
  return (await r.text()).trim();
});

const loadEngine = once(async () => {
  try {
    const m = await import("./engine/design_data_wasm_visual.js");
    await m.default();
    return m.Engine;
  } catch (e) {
    throw new Error(
      `The rendering engine could not be loaded (engine/): ${e.message}. ` +
        "Build the site with `design-data site --engine <dir>`; --data-only writes no engine.",
    );
  }
});

const engines = new Map();
const engineFor = (name, size, scheme, scale) => {
  const key = `${name}|${size}|${scheme}|${scale}`;
  if (!engines.has(key)) {
    const file = `${size}-${scheme}-${scale}.json`;
    engines.set(
      key,
      Promise.all([loadEngine(), json(`./variants/${name}/${file}`)]).then(
        ([Engine, variant]) => new Engine(JSON.stringify(variant)),
      ),
    );
    engines.get(key).catch(() => engines.delete(key));
  }
  return engines.get(key);
};

const parse = (v) => (v === "true" ? true : v);

export const backend = {
  components: async () => (await loadData()).components,

  // The platform this build was cascaded through ({id, name}); absent for the foundation.
  platform: () => data?.platform,

  // Figma collection and variable name for a token label, when it exports.
  figma: (label) => data?.figma?.[label],

  component: async (name) => {
    await loadData();
    const c = data.byName[name];
    if (!c) throw new Error(`No visual recipe for "${name}"`);
    // Under a platform alias the data is the target's; the page keys everything by the alias.
    return { ...c, name };
  },

  // Whether the component's recipe has label text and a content icon to change, and the
  // demo icons to pick from, keyed `set:name`.
  content: (name) => ({
    ...data.compiled[name].content,
    icons: Object.keys(data.icons ?? {}),
  }),

  // `q` holds `name`, `size`, `scheme`, `scale`, `label`, `state` and `opt.<option>` keys.
  scene: async (q) => {
    const [, metrics] = await Promise.all([loadData(), loadMetrics()]);
    const options = {};
    for (const [k, v] of Object.entries(q)) {
      if (!k.startsWith("opt.") || v === "" || v === false || v === "false")
        continue;
      const opt = k.slice(4);
      if (opt in (data.byName[q.name].options ?? {})) options[opt] = parse(v);
    }
    const size = q.size ?? "m";
    const scheme = q.scheme ?? "light";
    const scale = q.scale ?? "desktop";
    const engine = await engineFor(q.name, size, scheme, scale);
    const request = JSON.stringify({
      component: q.name,
      size,
      states: q.state && q.state !== "default" ? [q.state] : [],
      options,
      mode: { colorScheme: scheme, scale },
      label: q.label ?? "Label",
      icon: iconRequest(q.icon),
    });
    const scene = JSON.parse(
      engine.scene(`${request.slice(0, -1)},"textMetrics":${metrics}}`),
    );
    const id = data.platform?.id;
    if (id)
      scene.diagnostics = scene.diagnostics.map(
        (d) => `platform '${id}': ${d}`,
      );
    return scene;
  },
};
