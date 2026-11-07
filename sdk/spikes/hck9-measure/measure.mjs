import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";
const b64 = (p) => readFileSync(p).toString("base64");
const ss = b64("node_modules/@fontsource-variable/source-sans-3/files/source-sans-3-latin-wght-normal.woff2");
const fams = process.argv[2] ? process.argv[2].split("|") : null;
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
await page.setContent(`<!doctype html><link rel="stylesheet" href="https://use.typekit.net/flz1ovt.css">
<style>@font-face{font-family:'SS3';src:url(data:font/woff2;base64,${ss});font-weight:200 900}</style><body></body>`, { waitUntil: "networkidle" });
const out = await page.evaluate(async ({ fams }) => {
  const families = fams ?? ["adobe-clean-spectrum-vf", "adobe-clean", "SS3", "sans-serif"];
  const texts = ["Test", "Label", "Button", "Save changes", "Cancel", "Continue"];
  const sizes = [12, 14, 16, 18], weights = [700, 400];
  const rows = [];
  const cv = document.createElement("canvas").getContext("2d");
  for (const f of families) for (const w of weights) for (const s of sizes) {
    await document.fonts.load(`${w} ${s}px ${f}`);
    for (const t of texts) {
      cv.font = `${w} ${s}px ${f}`;
      const span = document.createElement("span");
      span.style.cssText = `font:${w} ${s}px ${f};white-space:pre;position:absolute`;
      span.textContent = t; document.body.append(span);
      rows.push({ f, w, s, t, canvas: cv.measureText(t).width, dom: span.getBoundingClientRect().width, loaded: document.fonts.check(`${w} ${s}px ${f}`) });
      span.remove();
    }
  }
  return { rows, status: [...document.fonts].map(x => `${x.family}/${x.weight}/${x.status}`) };
}, { fams });
console.log(out.status.join("\n"));
writeFileSync("measure.json", JSON.stringify(out.rows));
const sel = out.rows.filter(r => r.t === "Test" && r.w === 700);
for (const r of sel) console.log(r.f, r.s, r.canvas.toFixed(3), r.dom.toFixed(3), (r.canvas/r.s).toFixed(4));
await browser.close();
