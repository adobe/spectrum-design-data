// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Drives system Chrome against the built Hub prototype (`moon run hub-prototype:build`) to check
// that the explorer switches components in place. Run: `moon run platform-capture:test-site-switch`.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const dist = fileURLToPath(
  new URL("../../../docs/hub-prototype/dist", import.meta.url),
);
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".wasm": "application/wasm",
};
const server = createServer(async (req, res) => {
  try {
    let rel = normalize(
      decodeURIComponent(new URL(req.url, "http://x").pathname),
    );
    if (rel.endsWith("/")) rel += "index.html";
    const body = await readFile(join(dist, rel));
    res.writeHead(200, {
      "content-type": types[extname(rel)] ?? "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/rsp/`;

const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on(
    "response",
    (r) =>
      r.status() === 404 &&
      !r.url().endsWith("favicon.ico") &&
      errors.push(`404 ${r.url()}`),
  );
  const documents = [];
  page.on(
    "request",
    (r) => r.resourceType() === "document" && documents.push(r.url()),
  );

  const title = () => page.textContent("#title");
  const search = () => page.evaluate(() => location.search);
  const ready = (name) =>
    page.waitForFunction(
      (n) =>
        document.querySelector("#nav li.on a")?.getAttribute("href") ===
          `?c=${n}` && document.querySelector("#stage .cell, #stage svg"),
      name,
    );

  await page.goto(`${base}?c=button&tab=anatomy`);
  await ready("button");
  const first = await title();
  documents.length = 0;

  await page.click("#nav a[href='?c=checkbox']");
  await ready("checkbox");
  assert.notEqual(await title(), first);
  assert.equal(await search(), "?c=checkbox", "no stale params after a switch");
  assert.equal(await page.getAttribute("#stage", "data-mode"), "usage");
  assert.equal(await page.getAttribute("#nav li.on a", "aria-current"), "page");
  assert.match(await page.textContent("#nav-status"), /Checkbox/i);

  await page.goBack();
  await ready("button");
  assert.equal(await title(), first, "back restores the previous component");
  await page.goForward();
  await ready("checkbox");

  for (const n of ["switch", "badge", "accordion", "button"])
    await page.click(`#nav a[href='?c=${n}']`);
  await ready("button");
  assert.equal(await search(), "?c=button");

  assert.deepEqual(documents, [], "no document navigation");
  assert.deepEqual(errors, []);
  console.log("site-switch: ok");
} finally {
  await browser.close();
  server.close();
}
