// Copyright 2026 Adobe. All rights reserved.

import { readFileSync } from "node:fs";
import test from "ava";

const compiled = {
  component: "button-ios",
  root: "box",
  sizeScale: { m: 100 },
  optionDefaults: {},
  variants: {
    "m|light|desktop": {
      box: {
        kind: "box",
        children: [],
        props: { width: { value: 80 }, height: { value: 40 } },
      },
    },
  },
};

// Under a platform alias the site data holds the target's definition (name
// "button-ios") under the alias key ("button").
const table = JSON.parse(
  readFileSync(
    new URL("../../core/src/text-metrics/source-sans-3.json", import.meta.url),
    "utf8",
  ),
);
globalThis.fetch = async (url) => ({
  json: async () =>
    String(url).endsWith("text-metrics.json")
      ? table
      : {
          components: [{ name: "button", hasVisual: true }],
          byName: { button: { name: "button-ios", options: {} } },
          compiled: { button: compiled },
          platform: { id: "ios", name: "Spectrum iOS" },
        },
});
const { backend } = await import("../../plugins/site/assets/backend.js");

test("a platform alias loads under its alias key, so the page can render it", async (t) => {
  const c = await backend.component("button");
  t.is(c.name, "button");
  const scene = await backend.scene({ name: c.name, size: "m" });
  t.true(scene.nodes.length > 0);
});
