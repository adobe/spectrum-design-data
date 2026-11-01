// Copyright 2026 Adobe. All rights reserved.

import test from "ava";
import { renderScene } from "../../plugins/site/assets/visual-runtime.js";

// The compiled form of the recipe built by `padded_box` in sdk/core/src/visual.rs: a box with a
// label whose font size is 10 (so 13 high), with the given root props.
const compiledWith = (props) => ({
  component: "gadget",
  root: "box",
  sizeScale: { m: 100 },
  optionDefaults: {},
  variants: {
    "m|light|desktop": {
      box: {
        kind: "box",
        children: ["label"],
        props: { width: { value: 40 }, ...props },
      },
      label: { kind: "text", props: { fontSize: { value: 10 } } },
    },
  },
});

const height = (props) =>
  renderScene(compiledWith(props), {
    component: "gadget",
    size: "m",
    mode: { colorScheme: "light", scale: "desktop" },
    options: {},
  }).nodes[0].h;

test("block padding adds to the content height", (t) => {
  t.is(
    height({ paddingBlockStart: { value: 5 }, paddingBlockEnd: { value: 7 } }),
    25,
  );
  t.is(height({ paddingBlockStart: { value: 5 } }), 18);
});

test("an explicit height wins over block padding", (t) => {
  t.is(
    height({
      height: { value: 50 },
      paddingBlockStart: { value: 5 },
      paddingBlockEnd: { value: 7 },
    }),
    50,
  );
});

test("no block padding keeps the 32 default", (t) => {
  t.is(height({}), 32);
});
