// Copyright 2026 Adobe. All rights reserved.

import test from "ava";
import { Dataset } from "../pkg/node/design_data_wasm.js";
import {
  renderScene,
  renderSvg,
} from "../../plugins/site/assets/visual-runtime.js";

const compiledWith = (labelProps) => ({
  component: "gadget",
  root: "box",
  sizeScale: { m: 100 },
  optionDefaults: {},
  variants: {
    "m|light|desktop": {
      box: {
        kind: "box",
        children: ["label"],
        props: { width: { value: 40 } },
      },
      label: { kind: "text", props: labelProps },
    },
  },
});

const scene = (labelProps) =>
  renderScene(compiledWith(labelProps), {
    component: "gadget",
    size: "m",
    mode: { colorScheme: "light", scale: "desktop" },
    options: {},
  });

const labelHeight = (lineHeight) =>
  scene({
    fontSize: { value: 10 },
    ...(lineHeight ? { lineHeight } : {}),
  }).nodes[1].h;

test("text height follows lineHeight and defaults to 1.3 x fontSize", (t) => {
  t.is(labelHeight(), 13);
  t.is(labelHeight({ value: "20.5px" }), 20.5);
  t.is(labelHeight({ value: "1.5" }), 15);
});

test("a bound fontFamily leads the default stack", (t) => {
  const unbound = renderSvg(scene({ fontSize: { value: 10 } }));
  t.true(unbound.includes('font-family="adobe-clean-spectrum-vf,'));
  const bound = renderSvg(
    scene({ fontSize: { value: 10 }, fontFamily: { value: "SF Pro" } }),
  );
  t.true(bound.includes(`font-family="'SF Pro', adobe-clean-spectrum-vf,`));
});

test("family names with a digit are quoted so the list is valid CSS", (t) => {
  const svg = renderSvg(scene({ fontSize: { value: 10 } }));
  t.true(svg.includes("'Source Sans 3'"));
  t.false(/, Source Sans 3/.test(svg));
});

// Parity: the WASM renderer and the JS runtime agree on a recipe that binds the new props.
const parityRecipe = (labelProps) => ({
  specVersion: "1.0.0-draft",
  component: "action-button",
  root: "box",
  sizeScale: { m: 100 },
  parts: {
    box: {
      kind: "box",
      children: ["label"],
      props: { width: { value: 40 } },
    },
    label: { kind: "text", props: labelProps },
  },
});

const parityCases = [
  { fontSize: { value: 10 } },
  { fontSize: { value: 10 }, lineHeight: { value: "20.5px" } },
  { fontSize: { value: 10 }, lineHeight: { value: "1.5" } },
  { fontSize: { value: 10 }, lineHeight: { value: "128%" } },
  { fontSize: { value: 10 }, fontFamily: { value: "SF Pro" } },
  {
    fontSize: { value: 10 },
    lineHeight: { value: "12px" },
    fontFamily: { value: "A, B" },
  },
];

test("the WASM renderer and the JS runtime agree on lineHeight and fontFamily", (t) => {
  const req = {
    component: "action-button",
    size: "m",
    states: [],
    options: {},
    mode: { colorScheme: "light", scale: "desktop" },
    label: "Label",
  };
  const ds = Dataset.embedded();
  try {
    for (const props of parityCases) {
      const compiled = { ...compiledWith(props), component: "action-button" };
      const js = renderSvg(renderScene(compiled, req));
      t.is(js, ds.renderSvg(parityRecipe(props), req), JSON.stringify(props));
    }
  } finally {
    ds.free();
  }
});

test("an unparseable lineHeight falls back to 1.3 x fontSize", (t) => {
  t.is(labelHeight({ value: "128%" }), 13);
});
