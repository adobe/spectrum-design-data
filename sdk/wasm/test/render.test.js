// Copyright 2026 Adobe. All rights reserved.

import { readFileSync } from "node:fs";
import test from "ava";
import { Dataset } from "../pkg/node/design_data_wasm.js";

const recipe = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/design-data/visuals/action-button.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

const request = (options = {}) => ({
  component: "action-button",
  size: "m",
  states: [],
  options,
  mode: { colorScheme: "light", scale: "desktop" },
  label: "Label",
});

test("renderScene resolves a visual recipe against the embedded dataset", (t) => {
  const ds = Dataset.embedded();
  try {
    const scene = JSON.parse(ds.renderScene(recipe, request()));
    t.deepEqual(scene.diagnostics, []);
    t.is(scene.nodes[0].h, 32);
    t.is(scene.nodes[0].fill, "rgb(233, 233, 233)");
  } finally {
    ds.free();
  }
});

test("renderScene lets disabled override selected and emphasized", (t) => {
  const ds = Dataset.embedded();
  try {
    const scene = JSON.parse(
      ds.renderScene(
        recipe,
        request({ isSelected: true, isEmphasized: true, isDisabled: true }),
      ),
    );
    t.is(scene.nodes[0].fill, "rgb(233, 233, 233)");
  } finally {
    ds.free();
  }
});

test("renderSvg serializes the scene", (t) => {
  const ds = Dataset.embedded();
  try {
    t.true(ds.renderSvg(recipe, request()).startsWith("<svg"));
  } finally {
    ds.free();
  }
});
