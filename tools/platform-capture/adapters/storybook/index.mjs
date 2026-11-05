// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

// Storybook adapter: opens stories by URL in headless Chrome, screenshots the
// component element only, and writes `design-data-measured/1` JSON that
// `design-data render-compare` reads (docs/visual-comparison.md).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { collectTokenProperties, findDefaultPart, measureElement } from "./measure.mjs";

export const MEASURED_FORMAT = "design-data-measured/1";
export const RSP_BLOB = "https://reactspectrum.blob.core.windows.net/reactspectrum";
export const SWC_BASE = "https://spectrum-web-components.adobe.com";

// Storybook's args URL syntax: k:v;k2:v2, booleans as !true / !false, !null, !undefined.
// Values are limited to the characters Storybook accepts unescaped.
export function argsParam(args = {}) {
  return Object.entries(args)
    .map(([k, v]) => {
      const s = v === true ? "!true" : v === false ? "!false" : v === null ? "!null" : String(v);
      if (!/^[\w-]+$/.test(k) || !/^!?[\w .-]*$/.test(s)) throw new Error(`arg ${k}=${s} cannot be put in a Storybook URL`);
      return `${k}:${s}`;
    })
    .join(";");
}

export function storyUrl(base, id, { args, globals } = {}) {
  const q = [`id=${encodeURIComponent(id)}`, "viewMode=story"];
  if (args && Object.keys(args).length) q.push(`args=${argsParam(args)}`);
  if (globals && Object.keys(globals).length) q.push(`globals=${argsParam(globals)}`);
  return `${base.replace(/\/$/, "")}/iframe.html?${q.join("&")}`;
}

// A source says where stories live, how dark mode is switched, and what provenance to record.
export async function resolveSource({ source, sha, base, fetchImpl = fetch }) {
  if (source === "rsp") {
    if (!/^[0-9a-f]{40}$/.test(sha ?? "")) throw new Error("rsp needs --sha <full 40-char main commit SHA>");
    const url = `${RSP_BLOB}/${sha}/storybook-s2`;
    return {
      platform: "react-spectrum-s2",
      base: url,
      dark: { dataset: "colorScheme" },
      provenance: { platform: "react-spectrum-s2", adapter: "storybook", commit: sha, storybook: url },
    };
  }
  if (source === "swc") {
    const url = base ?? SWC_BASE;
    const res = await fetchImpl(`${url}/index.json`, { method: "HEAD" });
    if (!res.ok) throw new Error(`${url}/index.json: HTTP ${res.status}`);
    const lastModified = res.headers.get("last-modified");
    return {
      platform: "spectrum-web-components",
      base: url,
      dark: { globals: { theme: "dark" } },
      provenance: {
        platform: "spectrum-web-components",
        adapter: "storybook",
        storybook: url,
        lastModified,
        etag: res.headers.get("etag"),
        ...(await inferSwcVersion(lastModified, fetchImpl)),
      },
    };
  }
  throw new Error(`unknown source '${source}' (rsp, swc)`);
}

// The deployment does not expose its package version. Infer it: the newest @adobe/spectrum-wc
// release published on or before the deployment's Last-Modified. Flagged as inferred.
export async function inferSwcVersion(lastModified, fetchImpl = fetch) {
  try {
    const res = await fetchImpl("https://registry.npmjs.org/@adobe%2fspectrum-wc");
    const { time } = await res.json();
    const cutoff = Date.parse(lastModified);
    const [version] = Object.entries(time)
      .filter(([v, t]) => !["created", "modified"].includes(v) && Date.parse(t) <= cutoff)
      .sort((a, b) => Date.parse(b[1]) - Date.parse(a[1]))[0] ?? [];
    return { spectrumWcVersion: version ?? null, spectrumWcVersionBasis: "inferred: newest npm release published on or before Last-Modified" };
  } catch (e) {
    return { spectrumWcVersion: null, spectrumWcVersionBasis: `lookup failed: ${e.message}` };
  }
}

async function partHandle(root, selector, role) {
  const h = selector
    ? await root.locator(selector).first().elementHandle({ timeout: 5000 }).catch(() => null)
    : (await root.evaluateHandle(findDefaultPart, role)).asElement();
  return h;
}

// state: { id, story, args?, colorScheme?: light|dark, selector, parts?: { label?: css, icon?: css } }
// The container is the element `selector` matches. Part selectors are relative to the page and
// pierce open shadow roots.
export async function captureState(page, src, state, { outDir, trackProps }) {
  const dark = state.colorScheme === "dark";
  const globals = dark ? src.dark.globals : undefined;
  const url = storyUrl(src.base, state.story, { args: state.args, globals });
  await page.goto(url, { waitUntil: "networkidle" });
  if (dark && src.dark.dataset) await page.evaluate((k) => { document.documentElement.dataset[k] = "dark"; }, src.dark.dataset);
  // Fonts and colour transitions (a scheme switch animates) must settle before measuring.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {})));
  });
  if (!state.selector) throw new Error(`state ${state.id}: selector is required`);
  const container = page.locator(state.selector).first();
  await container.waitFor({ state: "visible", timeout: 15000 });
  const containerHandle = await container.elementHandle();

  const parts = {};
  const details = {};
  const roles = [["container", containerHandle], ...(await Promise.all(
    ["label", "icon"].map(async (role) => [role, await partHandle(state.parts?.[role] ? page : containerHandle, state.parts?.[role], role)]),
  ))];
  for (const [role, handle] of roles) {
    if (!handle) continue;
    const m = await handle.evaluate(measureElement, role);
    parts[role] = m.props;
    details[role] = { ...m.details };
    if (trackProps) details[role].tokenProperties = await handle.evaluate(collectTokenProperties);
  }

  mkdirSync(join(outDir, "shots"), { recursive: true });
  const png = join(outDir, "shots", `${state.id}.png`);
  await container.screenshot({ path: png, animations: "disabled" });
  return { measured: { id: state.id, parts }, detail: { id: state.id, story: state.story, url, png, parts: details } };
}

export async function capture(states, { source, sha, base, outDir, scale = 2 }) {
  const { chromium } = await import("playwright-core");
  const src = await resolveSource({ source, sha, base });
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  const measured = [];
  const detail = [];
  try {
    const ctx = await browser.newContext({ deviceScaleFactor: scale });
    const page = await ctx.newPage();
    for (const state of states) {
      const r = await captureState(page, src, state, { outDir, trackProps: source === "swc" });
      measured.push(r.measured);
      detail.push(r.detail);
    }
    src.provenance.capturedAt = new Date().toISOString().slice(0, 10);
    src.provenance.browser = `Chrome ${browser.version()}`;
    src.provenance.scale = scale;
  } finally {
    await browser.close();
  }
  const doc = { format: MEASURED_FORMAT, source: src.provenance, states: measured };
  writeFileSync(join(outDir, "measured.json"), JSON.stringify(doc, null, 2) + "\n");
  writeFileSync(join(outDir, "details.json"), JSON.stringify({ source: src.provenance, states: detail }, null, 2) + "\n");
  return doc;
}
