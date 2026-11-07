import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const M = JSON.parse(readFileSync("clean-metrics.json", "utf8"));
const width = (s, w) => { const t = M[w]; let sum = 0; for (let i = 0; i < s.length; i++) { sum += t.adv[s.charCodeAt(i)]; if (i) sum += t.kern[s[i-1]+s[i]] ?? 0; } return sum / 1000; };
const wrap = (text, w, size, maxW) => { // greedy; break opportunities: after a space or a hyphen
  const toks = text.match(/[^ -]*-|[^ -]+ ?|[^ -]* /g).map((x) => x); let lines = 1, cur = "";
  for (const tk of toks) { const next = cur + tk; if (cur && width(next.trimEnd(), w) * size > maxW) { lines++; cur = tk; } else cur = next; }
  return lines;
};
const texts = ["Save changes to the document before closing", "Sign in with your account to continue", "Add this item to your shopping cart", "Learn more about accessibility and labels", "An extraordinarily long single-line label that must wrap", "New feature available now"];
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
await page.setContent(`<!doctype html><link rel="stylesheet" href="https://use.typekit.net/flz1ovt.css"><body></body>`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.load("700 14px adobe-clean-spectrum-vf").then(() => document.fonts.load("400 14px adobe-clean-spectrum-vf")));
let total = 0, agree = 0; const bad = [];
for (const w of [400, 700]) for (const size of [12, 14, 16]) for (const t of texts) for (const maxW of [60, 80, 100, 120, 150, 200, 260]) {
  const real = await page.evaluate(({ t, w, size, maxW }) => { const d = document.createElement("div"); d.style.cssText = `font:${w} ${size}px adobe-clean-spectrum-vf;width:${maxW}px;position:absolute;overflow-wrap:normal`; d.textContent = t; document.body.append(d); const h = d.getBoundingClientRect().height; const lh = parseFloat(getComputedStyle(d).lineHeight) || size * 1.2; const n = new Set([...Array(1)].map(()=>0)); const r = document.createRange(); r.selectNodeContents(d); const tops = new Set([...r.getClientRects()].map(x => Math.round(x.top))); d.remove(); return tops.size; }, { t, w, size, maxW });
  const mine = wrap(t, w, size, maxW); total++; if (mine === real) agree++; else bad.push({ w, size, t: t.slice(0, 20), maxW, real, mine });
}
console.log(`greedy table wrap vs Chrome line count: ${agree}/${total} agree`); console.log(bad.slice(0, 6));
await browser.close();
