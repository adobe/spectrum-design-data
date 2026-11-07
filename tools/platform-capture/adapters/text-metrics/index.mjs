// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

// Generates a `--text-metrics` table (advance widths and pair kerning, the format of
// sdk/core/src/text-metrics/source-sans-3.json) for a font served by the Adobe Fonts kit, by
// measuring it in headless Chrome. The output is derived from Adobe Clean: write it to a
// git-ignored path (DEFAULT_OUT) and never commit or publish it.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_KIT } from "../../lib/rasterize/index.mjs";

export const DEFAULT_FAMILY = "adobe-clean-spectrum-vf";
export const WEIGHTS = [400, 700];
export const DEFAULT_OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../.cache/text-metrics/adobe-clean-spectrum-vf.json",
);
export const FIRST_CHAR = 32;
export const LAST_CHAR = 126;

// Runs in the page. Canvas measureText at 1000 px, so units are 1/1000 em, as in generate-source-sans-3.mjs.
export async function measureInPage({ family, weights, first, last }) {
  const cv = document.createElement("canvas").getContext("2d");
  const out = {};
  for (const w of weights) {
    const faces = await document.fonts.load(`${w} 100px ${family}`);
    if (!faces.length || faces.some((f) => f.status !== "loaded")) {
      throw new Error(`font '${family}' did not load at weight ${w}`);
    }
    cv.font = `${w} 1000px ${family}`;
    const adv = [];
    for (let c = first; c <= last; c++) adv.push(cv.measureText(String.fromCharCode(c)).width);
    const kern = {};
    for (let a = first + 1; a <= last; a++) {
      for (let b = first + 1; b <= last; b++) {
        const k = cv.measureText(String.fromCharCode(a, b)).width - adv[a - first] - adv[b - first];
        if (Math.abs(k) >= 1) kern[String.fromCharCode(a, b)] = Math.round(k);
      }
    }
    out[w] = { adv: adv.map(Math.round), kern };
  }
  cv.font = `700 14px ${family}`;
  return { weights: out, test700At14px: cv.measureText("Test").width };
}

export function buildTable({ weights, test700At14px }, { kit, family, date }) {
  return {
    font: family,
    source: `Adobe Fonts kit ${kit}, measured in headless Chrome. Derived from a licensed font: never commit or publish.`,
    generated: "platform-capture text-metrics: Chrome canvas measureText at 1000 px, units 1/1000 em",
    format:
      "weight -> { adv: advance of ASCII 32..126, kern: two-character pair -> adjustment }; other characters measure 0.46 em",
    meta: { generated: date, kit, family, test700At14px: Math.round(test700At14px * 1000) / 1000 },
    ...weights,
  };
}

// Integer-like keys sort first in a JS object, so join the notes and the weights as text to keep the notes on top.
export function serialize({ font, source, generated, format, meta, ...weights }) {
  const head = JSON.stringify({ font, source, generated, format, meta });
  return `${head.slice(0, -1)},\n${JSON.stringify(weights).slice(1)}\n`;
}

// Same shape the Rust and JS loaders enforce, so a bad run fails here and not in a render.
export function assertTable(table) {
  const n = LAST_CHAR - FIRST_CHAR + 1;
  for (const w of WEIGHTS) {
    const t = table[w];
    if (!t || t.adv?.length !== n || !t.adv.every((a) => Number.isFinite(a) && a > 0)) {
      throw new Error(`weight ${w}: expected ${n} positive advances`);
    }
    if (Object.keys(t.kern).some((k) => [...k].length !== 2)) throw new Error(`weight ${w}: bad kern key`);
  }
  if (!(table.meta.test700At14px > 0)) throw new Error("meta.test700At14px missing");
}

// `page` is a Playwright page (or a fake with setContent and evaluate).
export async function measureTable(page, { kit = DEFAULT_KIT, family = DEFAULT_FAMILY, date = new Date().toISOString().slice(0, 10) } = {}) {
  await page.setContent(`<!doctype html><link rel="stylesheet" href="${kit}">`, { waitUntil: "networkidle" });
  const raw = await page.evaluate(measureInPage, { family, weights: WEIGHTS, first: FIRST_CHAR, last: LAST_CHAR });
  const table = buildTable(raw, { kit, family, date });
  assertTable(table);
  return table;
}

export async function generate({ kit = DEFAULT_KIT, family = DEFAULT_FAMILY, out = DEFAULT_OUT, date } = {}) {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const table = await measureTable(await browser.newPage(), { kit, family, date });
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, serialize(table));
    return { table, out };
  } finally {
    await browser.close();
  }
}
