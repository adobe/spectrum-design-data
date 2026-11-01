// Copyright 2026 Adobe. All rights reserved.

import test from "ava";
import { renderScene } from "../../plugins/site/assets/visual-runtime.js";

// The compiled form of a recipe whose fill selector is `{"variant": "{style}"}`: one candidate
// per declared `style` value, each pinning that option. This is the output of `compile_recipe`
// for the `option_placeholder_in_a_selector_follows_the_request` test in sdk/core/src/visual.rs.
const compiled = {
  component: "gadget",
  root: "box",
  sizeScale: { m: 100 },
  optionDefaults: { style: "accent" },
  variants: {
    "m||": {
      box: {
        kind: "box",
        props: {
          fill: {
            candidates: [
              {
                value: "#ff0000",
                token: "gadget-accent-background-color",
                chain: [],
                states: [],
                options: { style: "accent" },
              },
              {
                value: "#00ff00",
                token: "gadget-primary-background-color",
                chain: [],
                states: [],
                options: { style: "primary" },
              },
            ],
            miss: "fill: no token matches {style}",
          },
        },
      },
    },
  },
};

const fill = (options) =>
  renderScene(compiled, { component: "gadget", size: "m", options }).nodes[0]
    .fill;

test("an option placeholder selects the candidate pinned to the requested value", (t) => {
  t.is(fill({ style: "accent" }), "#ff0000");
  t.is(fill({ style: "primary" }), "#00ff00");
  t.is(fill({}), "#ff0000", "the option default");
});
