// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language

// Drives system Chrome against the built Hub prototype (`moon run hub-prototype:build`) and checks
// from the accessibility tree that every form control in the explorer has a name.
// Run: `moon run platform-capture:test-site-a11y`.
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
const origin = `http://127.0.0.1:${server.address().port}`;
const roles = new Set([
  "combobox",
  "listbox",
  "switch",
  "checkbox",
  "textbox",
  "button",
  "radio",
]);

const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });
  const cdp = await page.context().newCDPSession(page);
  const unnamed = async (where) => {
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");
    const controls = nodes.filter(
      (n) =>
        !n.ignored && roles.has(n.role?.value) && n.name?.value !== undefined,
    );
    const bad = controls.filter((n) => !n.name.value.trim());
    assert.deepEqual(
      bad.map((n) => n.role.value),
      [],
      `${where}: unnamed controls`,
    );
    const names = controls.map((n) => n.name.value);
    assert.ok(controls.length > 8, `${where}: controls found`);
    return names;
  };
  const visibleLabels = async () =>
    page.$$eval("#controls label.f > span", (els) =>
      els.filter((e) => e.offsetParent).map((e) => e.textContent.trim()),
    );
  const check = async (path) => {
    await page.goto(`${origin}${path}`);
    await page.waitForSelector("#controls sp-picker");
    await page.waitForFunction(() => customElements.get("sp-picker"));
    await page.waitForTimeout(500);
    const names = await unnamed(path);
    for (const l of await visibleLabels())
      assert.ok(
        names.some((n) => n.includes(l)),
        `${path}: "${l}" names a control (got ${names.join("|")})`,
      );
    const ids = await page.evaluate(() =>
      [...document.querySelectorAll("#controls [id]")].map((e) => e.id),
    );
    assert.equal(
      new Set(ids).size,
      ids.length,
      `${path}: duplicate ids ${ids.filter((x, i) => ids.indexOf(x) !== i).slice(0, 5)}`,
    );
    const loose = await page.$$eval("#controls sp-picker", (els) =>
      els
        .filter(
          (e) =>
            !document
              .getElementById(e.getAttribute("aria-labelledby"))
              ?.textContent.trim(),
        )
        .map((e) => e.id),
    );
    assert.deepEqual(loose, [], `${path}: sp-picker without a label element`);
  };
  for (const p of [
    "/rsp/?c=button",
    "/rsp/?c=checkbox",
    "/rsp/?c=accordion",
    "/rsp/?c=radio-button",
    "/spios/?c=button",
  ])
    await check(p);

  await page.goto(`${origin}/rsp/?c=button`);
  await page.waitForSelector("#controls sp-picker");
  await page.click("#nav a[href='?c=checkbox']");
  await page.waitForFunction(
    () =>
      document.querySelector("#nav li.on a")?.getAttribute("href") ===
      "?c=checkbox",
  );
  await page.waitForTimeout(500);
  await unnamed("after in-place switch");
  const ids = await page.evaluate(() =>
    [...document.querySelectorAll("#controls [id]")].map((e) => e.id),
  );
  assert.equal(new Set(ids).size, ids.length, "duplicate ids after switch");
  console.log("site-a11y: ok");
} finally {
  await browser.close();
  server.close();
}
