// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Client-side backend: data.json holds component definitions and recipes whose
// token bindings were resolved by `design-data site`, and visual-runtime.js lays
// them out. No WASM and no server; all URLs are relative so the site works under
// any base path, such as GitHub Pages.

import { renderScene } from "./visual-runtime.js";

const data = await fetch(new URL("./data.json", import.meta.url)).then((r) =>
  r.json(),
);

const parse = (v) => (v === "true" ? true : v);

export const backend = {
  components: async () => data.components,

  // Figma collection and variable name for a token label, when it exports.
  figma: (label) => data.figma?.[label],

  component: async (name) => {
    const c = data.byName[name];
    if (!c) throw new Error(`No visual recipe for "${name}"`);
    return c;
  },

  // `q` holds `name`, `size`, `scheme`, `scale`, `label`, `state` and `opt.<option>` keys.
  scene: async (q) => {
    const options = {};
    for (const [k, v] of Object.entries(q)) {
      if (!k.startsWith("opt.") || v === "" || v === false || v === "false")
        continue;
      const opt = k.slice(4);
      if (opt in (data.byName[q.name].options ?? {})) options[opt] = parse(v);
    }
    return renderScene(data.compiled[q.name], {
      size: q.size ?? "m",
      states: q.state && q.state !== "default" ? [q.state] : [],
      options,
      mode: { colorScheme: q.scheme ?? "light", scale: q.scale ?? "desktop" },
      label: q.label ?? "Label",
    });
  },
};
