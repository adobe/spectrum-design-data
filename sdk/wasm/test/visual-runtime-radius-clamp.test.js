// Copyright 2026 Adobe. All rights reserved.

import test from "ava";
import { renderScene } from "../../plugins/site/assets/visual-runtime.js";

// The compiled form of the recipe built by `padded_box` in sdk/core/src/visual.rs, with the
// given root props.
const compiledWith = (props) => ({
  component: "gadget",
  root: "box",
  sizeScale: { m: 100 },
  optionDefaults: {},
  variants: {
    "m|light|desktop": {
      box: { kind: "box", children: ["label"], props },
      label: { kind: "text", props: { fontSize: { value: 10 } } },
    },
  },
});

const node = (height, cornerRadius) =>
  renderScene(
    compiledWith({
      height: { value: height },
      cornerRadius: { value: cornerRadius },
    }),
    {
      component: "gadget",
      size: "m",
      mode: { colorScheme: "light", scale: "desktop" },
      options: {},
      label: "Action",
    },
  ).nodes[0];

// The root box is as wide as its label (27.6 for font size 10), so the width limit is 13.8.
test("an oversized radius is clamped to half the smaller side", (t) => {
  t.is(node(20, 30).radius, 10);
  const tall = node(60, 30);
  t.is(tall.radius, tall.w / 2);
});

test("a radius within bounds is unchanged", (t) => {
  t.is(node(20, 6).radius, 6);
  t.is(node(20, 10).radius, 10);
});
