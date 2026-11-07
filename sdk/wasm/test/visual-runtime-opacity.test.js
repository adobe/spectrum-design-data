// Copyright 2026 Adobe. All rights reserved.

import test from "ava";
import "./helpers/text-metrics.js";
import { Dataset } from "../pkg/node/design_data_wasm.js";
import {
  renderScene,
  renderSvg,
} from "../../plugins/site/assets/visual-runtime.js";

const boxProps = (extra) => ({ width: { value: 40 }, ...extra });

const compiledWith = (extra) => ({
  component: "action-button",
  root: "box",
  sizeScale: { m: 100 },
  optionDefaults: {},
  variants: {
    "m|light|desktop": {
      box: { kind: "box", children: ["label"], props: boxProps(extra) },
      label: { kind: "text", props: { fontSize: { value: 10 } } },
    },
  },
});

const recipeWith = (extra) => ({
  specVersion: "1.0.0-draft",
  component: "action-button",
  root: "box",
  sizeScale: { m: 100 },
  parts: {
    box: { kind: "box", children: ["label"], props: boxProps(extra) },
    label: { kind: "text", props: { fontSize: { value: 10 } } },
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

test("root opacity wraps the drawing in one group; unset adds nothing", (t) => {
  const dim = renderScene(compiledWith({ opacity: { value: "0.6" } }), req);
  t.is(dim.opacity, 0.6);
  const svg = renderSvg(dim);
  t.true(svg.includes('<g opacity="0.6">'));
  t.true(svg.endsWith("</g></svg>"));
  const plain = renderScene(compiledWith({}), req);
  t.false("opacity" in plain);
  t.false(renderSvg(plain).includes("opacity"));
});

test("the WASM renderer and the JS runtime agree on root opacity", (t) => {
  const ds = Dataset.embedded();
  try {
    for (const extra of [{}, { opacity: { value: "0.6" } }]) {
      const js = renderSvg(renderScene(compiledWith(extra), req));
      t.is(js, ds.renderSvg(recipeWith(extra), req), JSON.stringify(extra));
    }
  } finally {
    ds.free();
  }
});
