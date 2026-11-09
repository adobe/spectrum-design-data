// Copyright 2026 Adobe. All rights reserved.
// Regenerates source-sans-3.json: advance widths (ASCII 32-126) and pair kerning at weights
// 400 and 700, measured with canvas measureText at 1000 px in Chrome, so units are 1/1000 em.
// Run from a directory with playwright-core and @fontsource-variable/source-sans-3 installed:
//   node generate-source-sans-3.mjs > source-sans-3.json
// Changing the table changes every visual golden; regenerate them with
// `VISUAL_PARITY_UPDATE=1 cargo test -p design-data-core --test visual_goldens`.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";

const woff = readFileSync(
  "node_modules/@fontsource-variable/source-sans-3/files/source-sans-3-latin-wght-normal.woff2",
).toString("base64");
const version = JSON.parse(
  readFileSync(
    "node_modules/@fontsource-variable/source-sans-3/package.json",
    "utf8",
  ),
).version;
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
await page.setContent(
  `<!doctype html><style>@font-face{font-family:'SS3';src:url(data:font/woff2;base64,${woff});font-weight:200 900}</style>`,
  { waitUntil: "load" },
);
const weights = await page.evaluate(async () => {
  const cv = document.createElement("canvas").getContext("2d");
  const out = {};
  for (const w of [400, 700]) {
    await document.fonts.load(`${w} 100px SS3`);
    cv.font = `${w} 1000px SS3`;
    const adv = [];
    for (let c = 32; c < 127; c++)
      adv.push(cv.measureText(String.fromCharCode(c)).width);
    const kern = {};
    for (let a = 33; a < 127; a++)
      for (let b = 33; b < 127; b++) {
        const k =
          cv.measureText(String.fromCharCode(a, b)).width -
          adv[a - 32] -
          adv[b - 32];
        if (Math.abs(k) >= 1) kern[String.fromCharCode(a, b)] = Math.round(k);
      }
    out[w] = { adv: adv.map(Math.round), kern };
  }
  return out;
});
await browser.close();
const header = {
  font: "Source Sans 3",
  source: `@fontsource-variable/source-sans-3@${version} (SIL Open Font License 1.1, see OFL-SourceSans3.txt)`,
  generated:
    "generate-source-sans-3.mjs: Chrome canvas measureText at 1000 px, units 1/1000 em",
  format:
    "weight -> { adv: advance of ASCII 32..126, kern: two-character pair -> adjustment }; other characters measure 0.46 em",
};
// Integer-like keys sort first in a JS object, so join the two parts as text to keep the notes on top.
process.stdout.write(
  `${JSON.stringify(header).slice(0, -1)},\n${JSON.stringify(weights).slice(1)}\n`,
);
