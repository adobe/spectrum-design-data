// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

// Rasterizes renderer SVGs (single files, or a `design-data render --batch`
// output folder) to PNG. Default engine: headless Chrome (playwright-core,
// system Chrome) with the Adobe Fonts kit, because Chrome applies web fonts and
// SVG font attributes the way the platforms do. The `resvg` engine is an
// offline fallback that needs Adobe Clean installed locally; fonts are never
// bundled or committed.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

export const DEFAULT_KIT = "https://use.typekit.net/flz1ovt.css";

// iOS captures are 3x devices; web Storybook captures use 2x.
export const defaultScale = (platform) => (platform === "ios" ? 3 : 2);

export function svgSize(svg) {
  const w = /<svg[^>]*\swidth="([\d.]+)"/.exec(svg);
  const h = /<svg[^>]*\sheight="([\d.]+)"/.exec(svg);
  return w && h ? { width: Number(w[1]), height: Number(h[1]) } : null;
}

// Each input is a .svg file, or a folder: with index.json (batch output, failed
// states skipped) or plain *.svg files. Returns [{ id, svgPath, platform }].
export function collectInputs(paths) {
  const items = [];
  for (const p of paths.map((x) => resolve(x))) {
    if (!statSync(p).isDirectory()) {
      items.push({ id: basename(p, ".svg"), svgPath: p, platform: null });
      continue;
    }
    let index = null;
    try {
      index = JSON.parse(readFileSync(join(p, "index.json"), "utf8"));
    } catch {}
    if (index) {
      for (const s of index.states ?? index) {
        if (s.error || !s.svg) continue;
        items.push({ id: s.id, svgPath: join(p, s.svg), platform: s.platform ?? null });
      }
    } else {
      for (const f of readdirSync(p).filter((f) => f.endsWith(".svg")).sort()) {
        items.push({ id: basename(f, ".svg"), svgPath: join(p, f), platform: null });
      }
    }
  }
  const seen = new Set();
  for (const { id } of items) {
    if (seen.has(id)) throw new Error(`duplicate id: ${id}`);
    seen.add(id);
  }
  return items;
}

async function rasterizeChrome(items, { outDir, scale, platform, kit, background }) {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ channel: "chrome" });
  const contexts = new Map();
  const results = [];
  try {
    for (const item of items) {
      const s = scale ?? defaultScale(item.platform ?? platform);
      if (!contexts.has(s)) contexts.set(s, await browser.newContext({ deviceScaleFactor: s }));
      const page = await contexts.get(s).newPage();
      try {
        const svg = readFileSync(item.svgPath, "utf8");
        const link = kit ? `<link rel="stylesheet" href="${kit}">` : "";
        const bg = background ? `background:${background}` : "";
        await page.setContent(
          `<!doctype html>${link}<body style="margin:0;${bg}">${svg}</body>`,
          { waitUntil: kit ? "networkidle" : "load" },
        );
        const fonts = await page.evaluate(async () => {
          await document.fonts.ready;
          return [...document.fonts].map((f) => f.status);
        });
        const warnings = [];
        if (kit && !fonts.includes("loaded")) warnings.push("no web font loaded from the kit (offline or blocked?)");
        const out = join(outDir, `${item.id}.png`);
        await page.locator("svg").first().screenshot({ path: out, omitBackground: !background });
        results.push({ id: item.id, png: out, scale: s, engine: "chrome", warnings });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  return results;
}

// Offline fallback. Needs the `resvg` binary and Adobe Clean installed locally.
// resvg's variable-font support is limited, so treat output as a review aid.
function rasterizeResvg(items, { outDir, scale, platform, background, fontsDir }) {
  return items.map((item) => {
    const s = scale ?? defaultScale(item.platform ?? platform);
    const out = join(outDir, `${item.id}.png`);
    const args = ["-z", String(s)];
    if (background) args.push("--background", background);
    if (fontsDir) args.push("--use-fonts-dir", fontsDir);
    execFileSync("resvg", [...args, item.svgPath, out], { stdio: "inherit" });
    return { id: item.id, png: out, scale: s, engine: "resvg", warnings: [] };
  });
}

export async function rasterize(paths, { outDir, engine = "chrome", scale, platform, kit = DEFAULT_KIT, background, fontsDir } = {}) {
  if (!outDir) throw new Error("outDir is required");
  const items = collectInputs(paths);
  mkdirSync(outDir, { recursive: true });
  const opts = { outDir, scale, platform, kit, background, fontsDir };
  const results = engine === "resvg" ? rasterizeResvg(items, opts) : await rasterizeChrome(items, opts);
  writeFileSync(join(outDir, "rasterize.json"), JSON.stringify({ engine, kit: engine === "chrome" ? kit : null, results }, null, 2) + "\n");
  return results;
}

