// Copyright 2026 Adobe. All rights reserved.

import { readFileSync } from "node:fs";
import test from "ava";
import { Dataset } from "../pkg/node/design_data_wasm.js";
import {
  iconFit,
  renderScene,
  renderSvg,
} from "../../plugins/site/assets/visual-runtime.js";

const ui = JSON.parse(
  readFileSync(
    new URL("../../../packages/design-data/icons/ui.json", import.meta.url),
    "utf8",
  ),
);
const chevron100 = ui.icons.chevron.sizes["100"];

const iconProps = {
  width: { value: 12 },
  rotation: { value: 90 },
  color: { value: "red" },
};
const holder = {
  kind: "box",
  children: ["mark"],
  props: { width: { value: 40 }, height: { value: 30 } },
};

const recipe = (icon) => ({
  specVersion: "1.0.0-draft",
  component: "action-button",
  root: "box",
  sizeScale: { m: 100 },
  parts: {
    box: { kind: "box", children: ["holder"] },
    holder,
    mark: { kind: "icon", icon, props: iconProps },
  },
});

// What `compile_recipe` writes for the recipe above: the part names its drawing.
const compiled = (icon, compiledPart) => ({
  component: "action-button",
  root: "box",
  sizeScale: { m: 100 },
  optionDefaults: {},
  drawings: {
    "ui:chevron@100": { viewBox: chevron100.viewBox, paths: chevron100.paths },
  },
  variants: {
    "m|light|desktop": {
      box: { kind: "box", children: ["holder"] },
      holder,
      mark: { kind: "icon", icon, props: iconProps, ...compiledPart },
    },
  },
});

const req = {
  component: "action-button",
  size: "m",
  states: [],
  options: {},
  mode: { colorScheme: "light", scale: "desktop" },
  label: "Label",
};

test("an icon part draws its compiled drawing the same in both engines", (t) => {
  const icon = { set: "ui", name: "chevron" };
  const scene = renderScene(compiled(icon, { drawing: "ui:chevron@100" }), req);
  const mark = scene.nodes.find((n) => n.part === "mark");
  t.deepEqual(mark.icon.drawing, {
    viewBox: chevron100.viewBox,
    paths: chevron100.paths,
  });
  const js = renderSvg(scene);
  t.true(js.includes(`d="${chevron100.paths[0].d}" fill="red"`));
  t.true(js.includes(' transform="rotate(90 '));
  const ds = Dataset.embedded();
  try {
    t.is(js, ds.renderSvg(recipe(icon), req));
    const wasm = JSON.parse(ds.renderScene(recipe(icon), req));
    t.deepEqual(wasm.nodes.find((n) => n.part === "mark").icon, mark.icon);
  } finally {
    ds.free();
  }
});

test("a missing icon draws the placeholder with the same diagnostic in both engines", (t) => {
  const icon = { set: "ui", name: "nope" };
  const miss =
    "icon ui:nope has no drawing for size 'm'; drawing a placeholder";
  const scene = renderScene(compiled(icon, { drawingMiss: miss }), req);
  t.deepEqual(scene.diagnostics, [miss]);
  const ds = Dataset.embedded();
  try {
    t.is(renderSvg(scene), ds.renderSvg(recipe(icon), req));
    t.deepEqual(JSON.parse(ds.renderScene(recipe(icon), req)).diagnostics, [
      miss,
    ]);
  } finally {
    ds.free();
  }
});

test("iconFit scales uniformly and centers, like icon_fit in Rust", (t) => {
  t.deepEqual(iconFit("0 0 20 10", 10, 10, 40, 40), { k: 2, tx: 10, ty: 20 });
  t.deepEqual(iconFit("5,5 10 10", 0, 0, 20, 20), { k: 2, tx: -10, ty: -10 });
  t.is(iconFit("0 0 0 10", 0, 0, 20, 20), undefined);
  t.is(iconFit("0 0 10", 0, 0, 20, 20), undefined);
});
