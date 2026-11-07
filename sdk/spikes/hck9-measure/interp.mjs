import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const M = JSON.parse(readFileSync("clean-metrics.json", "utf8"));
const width = (s, w) => { const t = M[w]; let sum = 0; for (let i = 0; i < s.length; i++) { sum += t.adv[s.charCodeAt(i)]; if (i) sum += t.kern[s[i-1]+s[i]] ?? 0; } return sum / 1000; };
const strs = ["Test","Label","Button","Save changes","Cancel","Continue","Delete item","Add to cart","Learn more","Sign in with your account"];
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
await page.setContent(`<!doctype html><link rel="stylesheet" href="https://use.typekit.net/flz1ovt.css">`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.load("500 100px adobe-clean-spectrum-vf"));
for (const w of [500, 600, 800]) {
  const real = await page.evaluate(({ strs, w }) => { const c = document.createElement("canvas").getContext("2d"); c.font = `${w} 100px adobe-clean-spectrum-vf`; return strs.map(s => c.measureText(s).width / 100); }, { strs, w });
  const f = Math.min(1, Math.max(0, (w - 400) / 300));
  const err = strs.map((s, i) => ((width(s, 400) * (1 - f) + width(s, 700) * f) - real[i]) / real[i] * 100);
  console.log(w, "interp/clamp error %: mean", (err.reduce((a, b) => a + b) / err.length).toFixed(2), "max abs", Math.max(...err.map(Math.abs)).toFixed(2));
}
await browser.close();
