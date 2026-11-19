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

test("applyPlatform renders through a platform manifest", (t) => {
  const ds = Dataset.embedded();
  try {
    const before = JSON.parse(ds.renderScene(recipe, request()));
    t.deepEqual(before.diagnostics, []);
    ds.applyPlatform({
      specVersion: "1.0.0-draft",
      foundationVersion: "1.0.0",
      include: ["property=color"],
    });
    const after = JSON.parse(ds.renderScene(recipe, request()));
    t.true(after.diagnostics.length > 0, "dropped tokens are reported");
    t.is(after.nodes[0].fill, "rgb(233, 233, 233)", "color tokens survive");
  } finally {
    ds.free();
  }
});

test("renderScene maps an aliased component to the platform's target", (t) => {
  const ds = Dataset.embedded();
  try {
    const iosRecipe = {
      component: "action-button-ios",
      root: "box",
      sizeScale: { m: 100 },
      parts: {
        box: {
          kind: "box",
          props: {
            height: { value: 41 },
            fill: { value: "rgb(9, 8, 7)" },
          },
        },
      },
    };
    const before = JSON.parse(ds.renderScene(recipe, request()));
    t.is(before.component, "action-button");
    ds.applyPlatform({
      specVersion: "1.0.0-draft",
      foundationVersion: "1.0.0",
      componentAliases: { "action-button": "action-button-ios" },
      extensions: {
        components: [{ name: "action-button-ios", options: {} }],
      },
    });
    // The caller passes the platform recipe; the request keeps the user-facing name.
    const after = JSON.parse(ds.renderScene(iosRecipe, request()));
    t.is(after.component, "action-button-ios", "the alias is resolved");
    t.is(after.nodes[0].h, 41, "the platform recipe's size is drawn");
    t.is(
      after.nodes[0].fill,
      "rgb(9, 8, 7)",
      "the platform recipe's fill is drawn",
    );
    t.not(after.nodes[0].fill, before.nodes[0].fill);
    t.not(after.nodes[0].h, before.nodes[0].h);
  } finally {
    ds.free();
  }
});

test("embedded dataset carries recipes and renders a component by name", (t) => {
  const ds = Dataset.embedded();
  try {
    t.true(ds.visualRecipes().includes("action-button"));
    t.is(ds.visualRecipe("action-button").component, "action-button");
    t.is(ds.visualRecipe("zzz-none"), undefined);
    t.true(ds.renderComponentSvg(request()).startsWith("<svg"));
    t.throws(() => ds.renderComponentSvg({ ...request(), component: "zzz" }), {
      message: /no visual recipe/,
    });
  } finally {
    ds.free();
  }
});

const visual = (name) =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../packages/design-data/visuals/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  );

const requestFor = (component, options = {}, states = []) => ({
  component,
  size: "m",
  states,
  options,
  mode: { colorScheme: "light", scale: "desktop" },
  label: "Link",
});

test("a link draws its underline, and a quiet one only on hover", (t) => {
  const ds = Dataset.embedded();
  try {
    const recipe = visual("link");
    const text = (s) => s.nodes.find((n) => n.part === "text");
    const rest = JSON.parse(ds.renderScene(recipe, requestFor("link")));
    t.deepEqual(rest.diagnostics, []);
    t.deepEqual(text(rest).underline, { thickness: 1, offset: 1 });
    t.true(ds.renderSvg(recipe, requestFor("link")).includes("<rect x="));
    const quiet = JSON.parse(
      ds.renderScene(recipe, requestFor("link", { isQuiet: true })),
    );
    t.is(text(quiet).underline, undefined);
    const hover = JSON.parse(
      ds.renderScene(recipe, requestFor("link", { isQuiet: true }, ["hover"])),
    );
    t.truthy(text(hover).underline);
  } finally {
    ds.free();
  }
});

test("a swatch reads its preview color, draws a translucent border and a selection band", (t) => {
  const ds = Dataset.embedded();
  try {
    const recipe = visual("swatch");
    const scene = JSON.parse(
      ds.renderScene(
        recipe,
        requestFor("swatch", { preview: "#9197fe", isSelected: true }),
      ),
    );
    t.deepEqual(scene.diagnostics, []);
    const part = (p) => scene.nodes.find((n) => n.part === p);
    t.is(part("fill").fill, "#9197fe");
    t.is(part("border").stroke_width, 2);
    t.truthy(part("inner-border"));
    const rest = JSON.parse(
      ds.renderScene(recipe, requestFor("swatch", { preview: "#9197fe" })),
    );
    t.is(rest.nodes.find((n) => n.part === "border").stroke_opacity, 0.42);
    const bad = JSON.parse(
      ds.renderScene(
        recipe,
        requestFor("swatch", { preview: "radial-gradient(#f00, #00f)" }),
      ),
    );
    t.true(bad.diagnostics.some((d) => d.includes("not a solid color")));
    t.truthy(bad.nodes.find((n) => n.part === "slash"));
  } finally {
    ds.free();
  }
});
