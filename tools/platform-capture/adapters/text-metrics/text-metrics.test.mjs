// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import test from "ava";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromeUnavailable } from "../../lib/skip.mjs";
import { DEFAULT_OUT, FIRST_CHAR, LAST_CHAR, WEIGHTS, assertTable, generate, serialize, measureInPage, measureTable } from "./index.mjs";

const N = LAST_CHAR - FIRST_CHAR + 1;
const weights = Object.fromEntries(WEIGHTS.map((w) => [w, { adv: Array(N).fill(500), kern: { To: -50 } }]));
const fakePage = (raw) => ({
  calls: [],
  async setContent(html, opts) {
    this.calls.push([html, opts]);
  },
  async evaluate() {
    return raw;
  },
});

test("measureTable loads the kit, stamps the table and validates it", async (t) => {
  const page = fakePage({ weights, test700At14px: 23.6654 });
  const table = await measureTable(page, { kit: "https://kit.test/x.css", family: "fam", date: "2026-11-07" });
  t.regex(page.calls[0][0], /href="https:\/\/kit\.test\/x\.css"/);
  t.deepEqual(table.meta, { generated: "2026-11-07", kit: "https://kit.test/x.css", family: "fam", test700At14px: 23.665 });
  t.is(table[700].adv.length, N);
  t.is(table[400].kern.To, -50);
  const text = serialize(table);
  t.deepEqual(JSON.parse(text), table);
  t.true(text.startsWith('{"font":"fam","source"'));
});

test("assertTable rejects an incomplete run", async (t) => {
  await t.throwsAsync(measureTable(fakePage({ weights: { 400: weights[400] }, test700At14px: 1 }), { date: "d" }), { message: /weight 700/ });
  await t.throwsAsync(measureTable(fakePage({ weights, test700At14px: 0 }), { date: "d" }), { message: /test700At14px/ });
  t.throws(() => assertTable({ 400: { adv: [1], kern: {} }, 700: weights[700], meta: {} }), { message: /95 positive/ });
});

// measureInPage runs inside Chrome; here it runs against a stub DOM whose font is 0.5 em wide with
// "To" kerned by -0.05 em, to check the units and the kerning arithmetic.
const stubDom = (loaded = true) => {
  const width = (s, size) => ([...s].length * 0.5 - (s === "To" ? 0.05 : 0)) * size;
  let size = 0;
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({
        set font(v) {
          size = Number(/(\d+)px/.exec(v)[1]);
        },
        measureText: (s) => ({ width: width(s, size) }),
      }),
    }),
    fonts: { load: async () => (loaded ? [{ status: "loaded" }] : []), check: () => loaded },
  };
};

test.serial("measureInPage returns 1/1000 em advances, rounded kerning and the 14 px stamp width", async (t) => {
  stubDom();
  const r = await measureInPage({ family: "f", weights: [400, 700], first: FIRST_CHAR, last: LAST_CHAR });
  t.is(r.weights[400].adv.length, N);
  t.true(r.weights[400].adv.every((a) => a === 500));
  t.deepEqual(r.weights[700].kern, { To: -50 });
  t.is(r.test700At14px, 28);
});

test.serial("measureInPage fails when the font does not load", async (t) => {
  stubDom(false);
  await t.throwsAsync(measureInPage({ family: "f", weights: [400], first: 32, last: 126 }), { message: /did not load/ });
});

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

test("the default output is git-ignored", (t) => {
  try {
    execFileSync("git", ["check-ignore", "-q", DEFAULT_OUT], { cwd: root });
    t.pass();
  } catch (e) {
    if (e.status === 1) t.fail("DEFAULT_OUT is not git-ignored");
    else t.pass("git unavailable; skipped");
  }
});

const DEFAULT_TABLE = "sdk/core/src/text-metrics/source-sans-3.json";

test("the committed Source Sans 3 default is the only tracked text-metrics table", (t) => {
  let files;
  try {
    files = execFileSync("git", ["ls-files", "*.json"], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 }).split("\n").filter(Boolean);
  } catch {
    return t.pass("git unavailable; skipped");
  }
  const offenders = [];
  for (const f of files) {
    if (f === DEFAULT_TABLE) continue;
    let text;
    try {
      if (statSync(join(root, f)).size > 5_000_000) continue;
      text = readFileSync(join(root, f), "utf8");
    } catch {
      continue;
    }
    if (!text.includes('"adv"')) continue;
    try {
      if (Array.isArray(JSON.parse(text)?.[700]?.adv)) offenders.push(f);
    } catch {}
  }
  t.deepEqual(offenders, [], "a text-metrics table is tracked outside the Source Sans 3 default; Adobe Clean widths must never be committed");
  t.is(JSON.parse(readFileSync(join(root, DEFAULT_TABLE), "utf8")).font, "Source Sans 3");
});

// Opt-in: loads the real kit (network, and VPN where the kit needs it).
const live = process.env.TEXT_METRICS_KIT_TEST ? test : test.skip;
live("kit: Test at weight 700 matches the React Spectrum S2 button label widths", async (t) => {
  const out = join(mkdtempSync(join(tmpdir(), "text-metrics-")), "t.json");
  let table;
  try {
    ({ table } = await generate({ out }));
  } catch (e) {
    return /executable|channel|chrome/i.test(String(e.message)) ? chromeUnavailable(t, e.message) : t.fail(String(e.stack));
  }
  const em = (s, w) => {
    const tb = table[w];
    let sum = 0;
    [...s].forEach((c, i) => {
      sum += tb.adv[c.charCodeAt(0) - FIRST_CHAR];
      if (i) sum += tb.kern[s[i - 1] + c] ?? 0;
    });
    return sum / 1000;
  };
  for (const [px, want] of [[12, 20.3], [14, 23.69], [16, 27.06], [18, 30.44]]) {
    t.true(Math.abs(em("Test", 700) * px - want) < 0.05, `${px}px: ${em("Test", 700) * px} vs ${want}`);
  }
  t.true(Math.abs(table.meta.test700At14px - 23.69) < 0.05);
});
