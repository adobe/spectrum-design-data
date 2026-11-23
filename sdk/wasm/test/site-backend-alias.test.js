// Copyright 2026 Adobe. All rights reserved.

import test from "ava";

// Under a platform alias the site data holds the target's definition (name
// "button-ios") under the alias key ("button").
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({
    components: [{ name: "button", hasVisual: true }],
    byName: { button: { name: "button-ios", options: {} } },
    compiled: {
      button: { content: { label: true, icon: { optional: true } } },
    },
    platform: { id: "ios", name: "Spectrum iOS" },
  }),
});
const { backend } = await import("../../plugins/site/assets/backend.js");

test("a platform alias loads under its alias key, so the page can render it", async (t) => {
  const c = await backend.component("button");
  t.is(c.name, "button");
  t.is(backend.platform().id, "ios");
  t.true(backend.content("button").label);
});
