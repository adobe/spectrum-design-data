// Copyright 2026 Adobe. All rights reserved.

import test from "ava";
import "./helpers/text-metrics.js";
import { renderScene } from "../../plugins/site/assets/visual-runtime.js";

// The compiled form of `stack` in sdk/core/src/visual.rs: two boxes (20x10 and 40x30) in a
// root 100 high with 10 inline padding and a gap of 4.
const box = (w, h) => ({
  kind: "box",
  props: { width: { value: w }, height: { value: h } },
});
const place = (props) => {
  const lit = Object.fromEntries(
    Object.entries(props).map(([k, v]) => [k, { value: v }]),
  );
  const compiled = {
    component: "gadget",
    root: "r",
    sizeScale: { m: 100 },
    optionDefaults: {},
    variants: {
      "m|light|desktop": {
        r: {
          kind: "box",
          children: ["a", "b"],
          props: {
            height: { value: 100 },
            paddingInlineStart: { value: 10 },
            paddingInlineEnd: { value: 10 },
            gap: { value: 4 },
            ...lit,
          },
        },
        a: box(20, 10),
        b: box(40, 30),
      },
    },
  };
  const scene = renderScene(compiled, {
    component: "gadget",
    size: "m",
    mode: { colorScheme: "light", scale: "desktop" },
    options: {},
  });
  const [o, a, b] = scene.nodes;
  return {
    size: [o.w, o.h],
    a: [a.x - o.x, a.y - o.y],
    b: [b.x - o.x, b.y - o.y],
    diagnostics: scene.diagnostics,
  };
};

test("a row centers across by default", (t) => {
  const r = place({});
  t.deepEqual(r.size, [84, 100]);
  t.deepEqual(
    [r.a, r.b],
    [
      [10, 45],
      [34, 35],
    ],
  );
});

test("align end puts a row's children at the bottom", (t) => {
  const r = place({ align: "end" });
  t.deepEqual([r.a[1], r.b[1]], [90, 70]);
});

test("a column stacks children and is as wide as the widest", (t) => {
  const r = place({ direction: "column" });
  t.deepEqual(r.size, [60, 100]);
  t.deepEqual(
    [r.a, r.b],
    [
      [20, 28],
      [10, 42],
    ],
  );
});

test("a column honors justify and align", (t) => {
  const r = place({ direction: "column", justify: "end", align: "start" });
  t.deepEqual(
    [r.a, r.b],
    [
      [10, 56],
      [10, 70],
    ],
  );
});

test("an unknown direction is a diagnostic", (t) => {
  const r = place({ direction: "diagonal" });
  t.is(r.diagnostics.length, 1);
  t.is(r.size[0], 84);
});
