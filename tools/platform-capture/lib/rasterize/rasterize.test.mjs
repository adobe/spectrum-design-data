// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import test from "ava";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectInputs, defaultScale, rasterize, svgSize } from "./index.mjs";

const svg = (fill) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 40 20"><rect width="40" height="20" fill="${fill}"/></svg>`;

const batch = () => {
  const dir = mkdtempSync(join(tmpdir(), "rasterize-"));
  writeFileSync(join(dir, "a-light.svg"), svg("#fff"));
  writeFileSync(join(dir, "a-dark.svg"), svg("#000"));
  writeFileSync(
    join(dir, "index.json"),
    JSON.stringify({
      states: [
        { id: "a-light", platform: "ios", svg: "a-light.svg" },
        { id: "a-dark", platform: "ios", svg: "a-dark.svg" },
        { id: "bad", error: "boom" },
      ],
    }),
  );
  return dir;
};

test("defaultScale: 3 for ios, 2 otherwise", (t) => {
  t.is(defaultScale("ios"), 3);
  t.is(defaultScale("react-spectrum"), 2);
  t.is(defaultScale(undefined), 2);
});

test("svgSize reads width and height", (t) => {
  t.deepEqual(svgSize(svg("red")), { width: 40, height: 20 });
  t.is(svgSize("<svg/>"), null);
});

test("collectInputs reads a batch index and skips failed states", (t) => {
  const items = collectInputs([batch()]);
  t.deepEqual(items.map((i) => [i.id, i.platform]), [["a-light", "ios"], ["a-dark", "ios"]]);
});

const pngSize = (p) => {
  const b = readFileSync(p);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

test("chrome: batch output at the platform default scale, light and dark", async (t) => {
  const out = mkdtempSync(join(tmpdir(), "rasterize-out-"));
  let results;
  try {
    results = await rasterize([batch()], { outDir: out, kit: null });
  } catch (e) {
    if (/Executable doesn't exist|chrome/i.test(String(e))) return t.log("system Chrome not found; skipped") && t.pass();
    throw e;
  }
  t.deepEqual(results.map((r) => r.id), ["a-light", "a-dark"]);
  for (const r of results) t.deepEqual(pngSize(r.png), [120, 60]); // 40x20 at 3x
});

test("chrome: explicit scale overrides the platform default", async (t) => {
  const out = mkdtempSync(join(tmpdir(), "rasterize-out-"));
  const f = join(out, "one.svg");
  writeFileSync(f, svg("#f00"));
  try {
    const [r] = await rasterize([f], { outDir: join(out, "png"), scale: 2, kit: null });
    t.deepEqual(pngSize(r.png), [80, 40]);
  } catch (e) {
    if (/Executable doesn't exist|chrome/i.test(String(e))) return t.pass();
    throw e;
  }
});
