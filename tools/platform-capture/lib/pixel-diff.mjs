#!/usr/bin/env node
// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

// Pixel diff of rasterized renderer output against element screenshots, as cropped pairs.
// usage: node pixel-diff.mjs --renders <batch dir> --png <rasterized dir> --shots <dir> --scale 2 --out <dir>
// Crops each renderer PNG to its root part's box (the SVG carries a margin), pads both images to
// a common size, and writes <out>/{expected,actual,diff}/<id>.png and <out>/pixel.json. Run
// `reg-cli <out>/actual <out>/expected <out>/diff -R <out>/report.html` for the HTML report.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const read = (p) => PNG.sync.read(readFileSync(p));

export function crop(png, x, y, w, h) {
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(png, out, x, y, w, h, 0, 0);
  return out;
}

export function pad(png, width, height) {
  if (png.width === width && png.height === height) return png;
  const out = new PNG({ width, height });
  PNG.bitblt(png, out, 0, 0, Math.min(png.width, width), Math.min(png.height, height), 0, 0);
  return out;
}

// Returns { expected, actual, diff, mismatched, total, sizes } for two PNGs.
export function comparePair(expected, actual, threshold = 0.1) {
  const width = Math.max(expected.width, actual.width);
  const height = Math.max(expected.height, actual.height);
  const e = pad(expected, width, height);
  const a = pad(actual, width, height);
  const diff = new PNG({ width, height });
  const mismatched = pixelmatch(e.data, a.data, diff.data, width, height, { threshold });
  return {
    expected: e,
    actual: a,
    diff,
    mismatched,
    total: width * height,
    sizes: { expected: [expected.width, expected.height], actual: [actual.width, actual.height] },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values } = parseArgs({
    options: { renders: { type: "string" }, png: { type: "string" }, shots: { type: "string" }, scale: { type: "string", default: "2" }, out: { type: "string" } },
  });
  if (!values.renders || !values.png || !values.shots || !values.out) {
    console.error("usage: node pixel-diff.mjs --renders <dir> --png <dir> --shots <dir> [--scale 2] --out <dir>");
    process.exit(2);
  }
  const scale = Number(values.scale);
  const index = JSON.parse(readFileSync(join(values.renders, "index.json"), "utf8"));
  for (const d of ["expected", "actual", "diff"]) mkdirSync(join(values.out, d), { recursive: true });
  const results = [];
  for (const s of index.states) {
    if (s.error) continue;
    const scene = JSON.parse(readFileSync(join(values.renders, s.scene), "utf8"));
    const root = scene.nodes.find((n) => n.part === "container") ?? scene.nodes[0];
    const full = read(join(values.png, `${s.id}.png`));
    const expected = crop(full, Math.round(root.x * scale), Math.round(root.y * scale), Math.round(root.w * scale), Math.round(root.h * scale));
    const r = comparePair(expected, read(join(values.shots, `${s.id}.png`)));
    for (const [d, img] of [["expected", r.expected], ["actual", r.actual], ["diff", r.diff]]) writeFileSync(join(values.out, d, `${s.id}.png`), PNG.sync.write(img));
    results.push({ id: s.id, mismatched: r.mismatched, total: r.total, ratio: Number((r.mismatched / r.total).toFixed(4)), sizes: r.sizes });
  }
  writeFileSync(join(values.out, "pixel.json"), JSON.stringify({ scale, results }, null, 2) + "\n");
  console.log(`${results.length} pair(s); mean mismatch ${(results.reduce((a, r) => a + r.ratio, 0) / results.length).toFixed(4)}`);
}
