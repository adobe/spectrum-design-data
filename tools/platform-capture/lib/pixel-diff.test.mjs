// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import test from "ava";
import { PNG } from "pngjs";
import { comparePair, crop, pad } from "./pixel-diff.mjs";

const solid = (w, h, [r, g, b, a = 255]) => {
  const p = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) p.data.set([r, g, b, a], i * 4);
  return p;
};

test("identical images have no mismatched pixels", (t) => {
  t.is(comparePair(solid(4, 4, [10, 20, 30]), solid(4, 4, [10, 20, 30])).mismatched, 0);
});

test("a different colour mismatches every pixel", (t) => {
  t.is(comparePair(solid(4, 4, [0, 0, 0]), solid(4, 4, [255, 255, 255])).mismatched, 16);
});

test("different sizes are padded to a common canvas and recorded", (t) => {
  const r = comparePair(solid(4, 4, [0, 0, 0]), solid(6, 4, [0, 0, 0]));
  t.deepEqual(r.sizes, { expected: [4, 4], actual: [6, 4] });
  t.is(r.total, 24);
  t.is(r.mismatched, 8); // the 2x4 strip only the larger image covers
});

test("crop and pad return the requested sizes", (t) => {
  const c = crop(solid(10, 10, [1, 2, 3]), 2, 2, 4, 3);
  t.deepEqual([c.width, c.height], [4, 3]);
  t.deepEqual([pad(c, 8, 8).width, pad(c, 8, 8).height], [8, 8]);
});
