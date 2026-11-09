// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Drives system Chrome against the built Hub prototype (`moon run hub-prototype:build`) and checks
// from the accessibility tree that every form control in the explorer has a name.
// Run: `moon run platform-capture:test-site-a11y`.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const dist =
  process.env.SITE_DIST ??
  fileURLToPath(new URL("../../../docs/hub-prototype/dist", import.meta.url));
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
  "spinbutton",
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
    page.$$eval("#controls .f > span", (els) =>
      els.filter((e) => e.offsetParent).map((e) => e.textContent.trim()),
    );
  const verify = async (where) => {
    const names = await unnamed(where);
    for (const l of await visibleLabels())
      assert.ok(
        names.some((n) => n.includes(l)),
        `${where}: "${l}" names a control (got ${names.join("|")})`,
      );
    const ids = await page.evaluate(() =>
      [...document.querySelectorAll("#controls [id]")].map((e) => e.id),
    );
    assert.equal(
      new Set(ids).size,
      ids.length,
      `${where}: duplicate ids ${ids.filter((x, i) => ids.indexOf(x) !== i).slice(0, 5)}`,
    );
    // Each label span must be the labelledby target of the control right after it.
    const loose = await page.$$eval("#controls .f > span", (els) =>
      els
        .filter(
          (e) => e.nextElementSibling?.getAttribute("aria-labelledby") !== e.id,
        )
        .map((e) => e.id),
    );
    assert.deepEqual(
      loose,
      [],
      `${where}: label span not wired to its control`,
    );
  };
  // A <label> with neither `for` nor a nested labelable control makes Chrome raise
  // FormLabelHasNeitherForNorNestedInputError, so custom-element rows must not be labels.
  const labelable = "input, select, textarea, button, meter, output, progress";
  // page.evaluate, not $$eval: Playwright selectors pierce shadow roots, which hold SWC's own labels.
  const orphanLabels = () =>
    page.evaluate(
      (sel) =>
        [...document.querySelectorAll("#controls label")]
          .filter((l) => {
            const target = l.htmlFor
              ? document.getElementById(l.htmlFor)
              : l.querySelector(sel);
            return !target?.matches(sel);
          })
          .map((l) => l.outerHTML),
      labelable,
    );
  const issueCounts = {};
  let labelIssues = 0;
  cdp.on("Audits.issueAdded", ({ issue }) => {
    if (
      issue.details?.genericIssueDetails?.errorType ===
      "FormLabelHasNeitherForNorNestedInputError"
    )
      labelIssues++;
  });
  await cdp.send("Audits.enable");
  const pickerLabelClicks = async (where) => {
    const ids = await page.$$eval("#controls .f > span[id^='lbl-']", (els) =>
      els
        .filter(
          (e) =>
            e.nextElementSibling?.localName === "sp-picker" &&
            !e.nextElementSibling.disabled,
        )
        .map((e) => e.id),
    );
    assert.ok(ids.length > 3, `${where}: picker rows found`);
    for (const id of ids) {
      if (!(await page.isVisible(`#${id}`))) continue;
      await page.click(`#${id}`);
      const r = await page.evaluate((labelId) => {
        const picker = document.querySelector(
          `sp-picker[aria-labelledby="${labelId}"]`,
        );
        return {
          focused: document.activeElement === picker,
          inner: picker.shadowRoot.activeElement?.localName,
          open: picker.open,
        };
      }, id);
      assert.deepEqual(
        r,
        { focused: true, inner: "button", open: false },
        `${where}: clicking ${id} focuses its picker without opening it`,
      );
    }
    await page.click("#lbl-content-label");
    assert.equal(
      await page.evaluate(() => document.activeElement?.id),
      "content-label",
      `${where}: Label text label focuses its input`,
    );
    await page.click("#lbl-content-width");
    assert.equal(
      await page.evaluate(() => document.activeElement?.id),
      "content-width",
      `${where}: Width label focuses its input`,
    );
  };
  const check = async (path) => {
    labelIssues = 0;
    await page.goto(`${origin}${path}`);
    await page.waitForSelector("#controls sp-picker");
    await page.waitForFunction(() => customElements.get("sp-picker"));
    await page.waitForTimeout(3500);
    issueCounts[path] = labelIssues;
    await verify(path);
    assert.deepEqual(
      await orphanLabels(),
      [],
      `${path}: label without control`,
    );
  };
  for (const p of [
    "/rsp/?c=button",
    "/rsp/?c=checkbox",
    "/rsp/?c=accordion",
    "/rsp/?c=radio-button",
    "/spios/?c=button",
  ])
    await check(p);

  labelIssues = 0;
  await page.goto(`${origin}/rsp/?c=button`);
  await page.waitForSelector("#controls sp-picker");
  await page.waitForTimeout(500);
  await pickerLabelClicks("/rsp/?c=button");
  await page.click("#nav a[href='?c=checkbox']");
  await page.waitForFunction(
    () =>
      document.querySelector("#nav li.on a")?.getAttribute("href") ===
      "?c=checkbox",
  );
  await page.waitForTimeout(500);
  await verify("after in-place switch");
  await pickerLabelClicks("after in-place switch");
  await page.waitForTimeout(3500);
  issueCounts["after in-place switch"] = labelIssues;
  console.log("label issues:", JSON.stringify(issueCounts));
  assert.deepEqual(
    Object.entries(issueCounts).filter(([, n]) => n),
    [],
    "FormLabelHasNeitherForNorNestedInputError issues",
  );
  console.log("site-a11y: ok");
} finally {
  await browser.close();
  server.close();
}
