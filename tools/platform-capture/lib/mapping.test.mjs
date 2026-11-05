// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import test from "ava";
import { readFileSync } from "node:fs";
import { expand, mapArgs, stateId } from "./mapping.mjs";

const mapping = JSON.parse(readFileSync(new URL("../adapters/storybook/mappings/react-spectrum-s2-button.json", import.meta.url), "utf8"));
const layout = "icon-label";

test("mapArgs maps names and values", (t) => {
  t.deepEqual(mapArgs(mapping, { variant: "accent", fillStyle: "outline", size: "XL", isDisabled: true }), {
    options: { variant: "accent", style: "outline", size: "xl", isDisabled: true },
    unmapped: [],
  });
});

test("mapArgs reports values and args the recipe lacks", (t) => {
  const { unmapped } = mapArgs(mapping, { variant: "premium", staticColor: "auto", styles: "x" });
  t.deepEqual(unmapped.map((u) => u.arg), ["variant", "staticColor", "styles"]);
});

test("expand writes matching render and capture ids, passes defaults, skips unmapped", (t) => {
  const r = expand(mapping, { cases: [{ size: "M", variant: "accent" }, { size: "M", variant: "genai" }], colorSchemes: ["light", "dark"] }, layout);
  t.deepEqual(r.render.map((s) => s.id), ["button-m-accent-fill-light", "button-m-accent-fill-dark"]);
  t.deepEqual(r.capture.map((s) => s.id), r.render.map((s) => s.id));
  t.is(r.render[0].options.style, "fill"); // default passed explicitly
  t.is(r.render[0].size, "m");
  t.is(r.render[0].platform, "react-spectrum");
  t.is(r.unmapped.length, 2);
  t.is(r.capture[0].selector, "#storybook-root button:nth-of-type(2)");
});

test("expand needs a layout", (t) => {
  t.throws(() => expand(mapping, { cases: [] }));
});

test("stateId", (t) => {
  t.is(stateId(mapping, { size: "L", variant: "primary", fillStyle: "outline", isDisabled: true }, "dark"), "button-l-primary-outline-disabled-dark");
});
