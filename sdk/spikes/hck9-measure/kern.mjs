import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
await page.setContent(`<!doctype html><link rel="stylesheet" href="https://use.typekit.net/flz1ovt.css">`, { waitUntil: "networkidle" });
const res = await page.evaluate(async () => {
  const cv = document.createElement("canvas").getContext("2d");
  const f = "adobe-clean-spectrum-vf", out = {};
  const strs = ["Test","Label","Button","Save changes","Cancel","Continue","Delete item","Add to cart","Learn more","Sign in with your account","WAVE Typography AVATAR To Yo"];
  for (const w of [400, 700]) {
    await document.fonts.load(`${w} 100px ${f}`);
    cv.font = `${w} 1000px ${f}`;
    const adv = {}; for (let c = 32; c < 127; c++) adv[c] = cv.measureText(String.fromCharCode(c)).width;
    const kern = {};
    for (let a = 33; a < 127; a++) for (let b = 33; b < 127; b++) {
      const k = cv.measureText(String.fromCharCode(a, b)).width - adv[a] - adv[b];
      if (Math.abs(k) >= 1) kern[String.fromCharCode(a, b)] = Math.round(k);
    }
    cv.font = `${w} 100px ${f}`;
    const rows = strs.map((s) => {
      let sum = 0; for (let i = 0; i < s.length; i++) { sum += adv[s.charCodeAt(i)]; if (i) sum += kern[s[i-1]+s[i]] ?? 0; }
      return { s, real: cv.measureText(s).width / 100, sum: sum / 1000 };
    });
    out[w] = { adv, kern, rows, pairs: Object.keys(kern).length };
  }
  return out;
});
writeFileSync("clean-metrics.json", JSON.stringify(res));
for (const w of [400, 700]) {
  const r = res[w].rows, err = r.map((x) => (x.sum - x.real) / x.real * 100);
  console.log(w, "kern pairs", res[w].pairs, "mean err %", (err.reduce((a,b)=>a+b)/err.length).toFixed(3), "max abs %", Math.max(...err.map(Math.abs)).toFixed(3));
}
console.log(res[700].rows.map(r=>`${r.s}: ${r.real.toFixed(4)} vs ${r.sum.toFixed(4)}`).join("\n"));
await browser.close();
