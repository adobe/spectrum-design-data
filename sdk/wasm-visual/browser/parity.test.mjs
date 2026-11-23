// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Browser parity: the engine a built site ships (engine/, variants/, text-metrics.json),
// loaded the way backend.js loads it in headless Chrome, draws the same SVG as
// `design-data render` byte for byte over the matrix shared with test/engine.test.mjs.
// Needs Chrome, the CLI and `moon run sdk-wasm-visual:build-web` (pkg/web).
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  buildSites,
  buildStates,
  cliRender,
  requestFor,
  root,
  variantFile,
  variantKey,
} from "../shared/matrix.mjs";

const { chromium } = createRequire(
  join(root, "tools/platform-capture/package.json"),
)("playwright-core");
const web = join(root, "sdk/wasm-visual/pkg/web");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".wasm": "application/wasm",
};

const dir = mkdtempSync(join(tmpdir(), "slim-browser-"));
let sites;
let states;
let want;
let server;
let browser;
let base;

describe("the site's engine in Chrome equals design-data render", () => {
  before(async () => {
    assert.ok(
      existsSync(join(web, "design_data_wasm_visual_bg.wasm")),
      "run build-web",
    );
    sites = buildSites(dir, web);
    states = buildStates(sites);
    want = cliRender(dir, states);
    // Each platform's site is served under its own sub-path, so relative URLs are exercised.
    server = createServer((req, res) => {
      const { pathname } = new URL(req.url, "http://localhost");
      const [, platform, ...rest] = pathname.split("/");
      if (pathname === "/favicon.ico") return res.writeHead(204).end();
      try {
        const file = join(
          sites[platform].out,
          normalize(rest.join("/") || "index.html"),
        );
        res.writeHead(200, {
          "content-type": types[extname(file)] ?? "text/plain",
        });
        res.end(readFileSync(file));
      } catch {
        res.writeHead(404).end();
      }
    }).listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ channel: "chrome" });
  });
  after(async () => {
    await browser?.close();
    server?.close();
  });

  for (const platform of ["foundation", "ios"]) {
    it(`${platform}: svg matches byte for byte`, async () => {
      const mine = states.filter((s) => s.platform === platform);
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      await page.goto(`${base}/${platform}/text-metrics.json`);
      const jobs = mine.map((s) => ({
        id: s.id,
        site: s.site,
        file: variantFile(variantKey(s)),
        request: JSON.stringify(requestFor(s, want.get(s.id).component)),
      }));
      const got = await page.evaluate(async (jobs) => {
        const m = await import(
          `${location.origin}${location.pathname.replace(/[^/]*$/, "")}engine/design_data_wasm_visual.js`
        );
        await m.default();
        const out = {};
        for (const j of jobs) {
          const v = await (await fetch(`variants/${j.site}/${j.file}`)).text();
          const engine = new m.Engine(v);
          out[j.id] = engine.svg(j.request);
          engine.free();
        }
        return out;
      }, jobs);
      await page.close();
      assert.deepEqual(errors, []);
      assert.ok(mine.length > 40);
      for (const s of mine) assert.equal(got[s.id], want.get(s.id).svg, s.id);
    });
  }
});
