// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import test from "ava";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MEASURED_FORMAT, argsParam, resolveSource, storyUrl } from "./index.mjs";
import { collectTokenProperties, findDefaultPart, measureElement } from "./measure.mjs";

test("argsParam uses Storybook's args syntax", (t) => {
  t.is(argsParam({ variant: "accent", size: "L", isDisabled: true, n: 2 }), "variant:accent;size:L;isDisabled:!true;n:2");
  t.throws(() => argsParam({ label: "a;b" }));
});

test("storyUrl builds iframe URLs with args and globals", (t) => {
  t.is(
    storyUrl("https://x.test/sb/", "button--example", { args: { variant: "accent" }, globals: { theme: "dark" } }),
    "https://x.test/sb/iframe.html?id=button--example&viewMode=story&args=variant:accent&globals=theme:dark",
  );
});

test("rsp source requires a full SHA and pins the per-commit URL", async (t) => {
  await t.throwsAsync(resolveSource({ source: "rsp", sha: "36f3adde2" }));
  const sha = "36f3adde26ccd12f3cc18c9d0293ece0f10e94c7";
  const src = await resolveSource({ source: "rsp", sha });
  t.is(src.base, `https://reactspectrum.blob.core.windows.net/reactspectrum/${sha}/storybook-s2`);
  t.is(src.provenance.commit, sha);
});

test("swc source records Last-Modified and ETag", async (t) => {
  const headers = new Map([["last-modified", "Tue, 27 Oct 2026 23:05:51 GMT"], ["etag", '"abc"']]);
  const fetchImpl = async (url) =>
    url.includes("registry")
      ? { json: async () => ({ time: { created: "2026-01-01T00:00:00Z", "1.0.0": "2026-10-01T00:00:00Z", "2.0.0": "2026-11-01T00:00:00Z" } }) }
      : { ok: true, headers };
  const src = await resolveSource({ source: "swc", fetchImpl });
  t.is(src.provenance.lastModified, "Tue, 27 Oct 2026 23:05:51 GMT");
  t.is(src.provenance.etag, '"abc"');
  t.is(src.provenance.spectrumWcVersion, "1.0.0");
});

// The CLI finds the dataset from the working directory, so run it from the repo root.
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

const PAGE = `<!doctype html><style>
  :root { --spectrum-accent: rgb(10, 20, 30); --swc-pad: 12px; }
  .btn { display: inline-flex; align-items: center; box-sizing: border-box; height: 40px; padding: 0 20px;
    border-radius: 9999px; background: var(--spectrum-accent); color: rgb(255, 255, 255);
    font: 700 16px/18px Arial; border: 0; }
</style><body style="margin:0"><button class="btn"><svg width="10" height="10"></svg><span>Press me</span></button></body>`;

async function withPage(t, fn) {
  const { chromium } = await import("playwright-core");
  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome" });
  } catch {
    return t.pass("system Chrome not found; skipped");
  }
  try {
    const page = await browser.newPage();
    await page.setContent(PAGE);
    await fn(page);
  } finally {
    await browser.close();
  }
}

test("measureElement reads container, label and icon values in CSS px", (t) =>
  withPage(t, async (page) => {
    const btn = await page.locator(".btn").elementHandle();
    const c = (await btn.evaluate(measureElement, "container")).props;
    t.like(c, { height: 40, paddingLeft: 20, paddingRight: 20, paddingTop: 0, cornerRadius: 20, fill: "rgb(10, 20, 30)" });
    const label = await (await page.locator("span").elementHandle()).evaluate(measureElement, "label");
    t.like(label.props, { fontSize: 16, fontWeight: 700, color: "rgb(255, 255, 255)" });
    t.true(label.props.width > 40 && label.props.width < 80);
    t.regex(label.details.fontFamily, /Arial/);
    const icon = (await (await page.locator("svg").elementHandle()).evaluate(measureElement, "icon")).props;
    t.like(icon, { width: 10, height: 10 });
    // default part finding
    const part = async (role) => (await btn.evaluateHandle(findDefaultPart, role)).evaluate((e) => e?.localName);
    t.is(await part("label"), "span");
    t.is(await part("icon"), "svg");
  }));

test("collectTokenProperties lists matching var(--spectrum-*) declarations with resolved values", (t) =>
  withPage(t, async (page) => {
    const btn = await page.locator(".btn").elementHandle();
    const found = await btn.evaluate(collectTokenProperties);
    const bg = found.find((f) => f.property === "background-color" || f.property === "background");
    t.truthy(bg);
    t.is(bg.resolved["--spectrum-accent"], "rgb(10, 20, 30)");
    t.false(found.some((f) => f.resolved["--swc-pad"] !== undefined));
  }));

test("measured output is accepted by design-data render-compare", (t) => {
  let ver;
  try {
    ver = execFileSync("design-data", ["--version"], { encoding: "utf8" });
  } catch {
    return t.pass("design-data CLI not found; skipped");
  }
  if (!/design-data 0\.(1[4-9]|[2-9]\d)|design-data [1-9]/.test(ver)) return t.pass(`CLI ${ver.trim()} lacks render-compare; skipped`);
  const dir = mkdtempSync(join(tmpdir(), "sb-compare-"));
  writeFileSync(join(dir, "states.json"), JSON.stringify([{ id: "s1", component: "button", options: {} }]));
  execFileSync("design-data", ["render", "--batch", join(dir, "states.json"), "--out", join(dir, "renders")], { stdio: "pipe", cwd: REPO_ROOT });
  writeFileSync(
    join(dir, "measured.json"),
    JSON.stringify({
      format: MEASURED_FORMAT,
      source: { platform: "test" },
      states: [{ id: "s1", parts: { container: { width: 90, height: 32, paddingLeft: 14, cornerRadius: 16, fill: "rgb(59, 99, 251)" }, label: { width: 40, height: 15, fontSize: 14, fontWeight: 700, color: "rgb(255, 255, 255)" } } }],
    }),
  );
  const out = execFileSync("design-data", ["render-compare", "--scenes", join(dir, "renders"), "--measured", join(dir, "measured.json")], { encoding: "utf8", cwd: REPO_ROOT });
  const report = JSON.parse(out);
  t.true(report.states.length === 1);
  // No property the comparison does not know ("unsupported property").
  t.false(report.states[0].skipped.some((s) => s.reason === "unsupported property"));
});
