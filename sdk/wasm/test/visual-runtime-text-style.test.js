// Copyright 2026 Adobe. All rights reserved.

import test from "ava";
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
