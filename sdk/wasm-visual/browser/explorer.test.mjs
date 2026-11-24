// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Explorer smoke in headless Chrome: every component page with a recipe draws engine SVG
// (parts carry data-part) in the usage matrix and in the anatomy view, with no console errors.
// Needs Chrome and `moon run sdk-wasm-visual:build-web` (pkg/web).
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { after, before, describe, it } from "node:test";
import { buildSites, root } from "../shared/matrix.mjs";

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

let sites;
let server;
let browser;
let base;

describe("every explorer page draws the engine's SVG", () => {
  before(async () => {
    assert.ok(
      existsSync(join(web, "design_data_wasm_visual_bg.wasm")),
      "run build-web",
    );
    sites = buildSites(mkdtempSync(join(tmpdir(), "explorer-")), web);
    server = createServer((req, res) => {
      const { pathname } = new URL(req.url, "http://localhost");
      const [, platform, ...rest] = pathname.split("/");
      try {
        const file = join(
          sites[platform].out,
          normalize(rest.join("/") || "index.html"),
        );
        const body = readFileSync(file);
        res.writeHead(200, {
          "content-type": types[extname(file)] ?? "text/plain",
        });
        res.end(body);
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
    it(`${platform}: usage and anatomy draw parts, no console errors`, async () => {
      const data = JSON.parse(
        readFileSync(join(sites[platform].out, "data.json"), "utf8"),
      );
      const names = data.components
        .filter((c) => c.hasVisual)
        .map((c) => c.name);
      assert.ok(names.length > 5, `${names.length} pages`);
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      // Missing optional hub files (platforms.json, specs) 404 on a bare site build.
      page.on(
        "console",
        (m) =>
          m.type() === "error" &&
          !m.text().startsWith("Failed to load resource") &&
          errors.push(m.text()),
      );
      for (const name of names) {
        await page.goto(`${base}/${platform}/index.html?c=${name}`);
        await page.waitForSelector("#stage .cell svg [data-part]");
        const usage = await page.$$eval("#stage .cell svg", (s) =>
          s.map((e) => e.querySelectorAll("[data-part]").length),
        );
        assert.ok(usage.length && usage.every((n) => n > 0), `${name} usage`);
        await page.click('[data-tab="anatomy"]');
        await page.waitForSelector("#stage #zg [data-part]");
        assert.ok(await page.$("#stage .co"), `${name} anatomy callouts`);
        assert.equal(await page.$("#fatal:not([hidden])"), null, name);
      }
      await page.close();
      assert.deepEqual(errors, []);
    });
  }
});
