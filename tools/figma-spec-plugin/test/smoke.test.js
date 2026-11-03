// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * code.js only runs in the Figma plugin sandbox, so this runs it in a vm against a fake
 * `figma` global and the checked-in action-button sheet and changelog. It checks the
 * structure the plugin builds and that a second render replaces the first.
 */
import test from "ava";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const code = readFileSync(join(here, "../code.js"), "utf-8");
const data = (kind) =>
  JSON.parse(
    readFileSync(
      join(here, `../../../docs/hub-prototype/data/${kind}/action-button.json`),
      "utf-8",
    ),
  );
const sheet = data("sheets");
const changelog = data("changelog");

function node(type) {
  const n = { type, children: [], parent: null, width: 40, height: 14 };
  n.appendChild = (c) => {
    c.parent = n;
    n.children.push(c);
  };
  n.resize = (w, h) => {
    n.width = w;
    n.height = h;
  };
  n.remove = () => {
    if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1);
  };
  n.findOne = (pred) => n.children.find(pred) ?? null;
  return n;
}

function mock() {
  const page = node("PAGE");
  const messages = [];
  const figma = {
    currentPage: page,
    showUI() {},
    ui: { onmessage: null, postMessage: (m) => messages.push(m) },
    loadFontAsync: async () => {},
    createFrame: () => node("FRAME"),
    createRectangle: () => node("RECTANGLE"),
    createEllipse: () => node("ELLIPSE"),
    createText() {
      const t = node("TEXT");
      let chars = "";
      Object.defineProperty(t, "characters", {
        get: () => chars,
        set: (v) => {
          chars = v;
          t.width = v.length * 6;
        },
      });
      return t;
    },
  };
  vm.runInNewContext(code, { figma, __html__: "" });
  return { figma, page, messages };
}

const count = (n, pred) =>
  (pred(n) ? 1 : 0) + n.children.reduce((s, c) => s + count(c, pred), 0);

test("renders the Layout and Color pages with a block per spec block", async (t) => {
  const { figma, page, messages } = mock();
  await figma.ui.onmessage({
    type: "render-sheet",
    sheet,
    changelog,
    pages: ["Layout", "Color"],
  });
  const done = messages.find((m) => m.type === "render-complete");
  t.truthy(done, JSON.stringify(messages));
  const expected = sheet.pages
    .filter((p) => ["Layout", "Color"].includes(p.title))
    .reduce((s, p) => s + p.blocks.length, 0);
  t.is(done.result.blocksRendered, expected);
  const root = page.children[0];
  t.is(root.name, "Action button – spec (generated)");
  t.is(
    count(root, (n) => n.name?.startsWith("Block – ")),
    expected,
  );
  t.true(count(root, (n) => n.name === "Changelog item") > 0);
});

test("changelog rows hide metadata-class changes and show the PR title", async (t) => {
  const { figma, page } = mock();
  await figma.ui.onmessage({
    type: "render-sheet",
    sheet,
    changelog,
    pages: ["Layout"],
  });
  const rows = [];
  const walk = (n) => {
    if (n.name === "Changelog item") rows.push(n.children[0].characters);
    n.children.forEach(walk);
  };
  walk(page.children[0]);
  const withChanges = changelog.revisions.filter((r) =>
    r.entries.some((e) => e.class !== "metadata"),
  );
  t.is(rows.length, withChanges.length);
  t.true(rows.every((r) => !/metadata/.test(r)));
  const pr = changelog.revisions.find(
    (r) =>
      r.source.type === "pr" && r.entries.some((e) => e.class !== "metadata"),
  );
  t.true(rows.some((r) => r.includes(pr.source.title)));
});

test("re-rendering replaces the root frame instead of adding another", async (t) => {
  const { figma, page } = mock();
  await figma.ui.onmessage({
    type: "render-sheet",
    sheet,
    changelog,
    pages: ["Layout"],
  });
  const first = count(page, () => true);
  await figma.ui.onmessage({
    type: "render-sheet",
    sheet,
    changelog,
    pages: ["Layout"],
  });
  t.is(page.children.length, 1);
  t.is(
    count(page, () => true),
    first,
  );
});

test("measurements are drawn from the scene and labelled by the sheet", async (t) => {
  const { figma, page } = mock();
  await figma.ui.onmessage({ type: "render-sheet", sheet, pages: ["Layout"] });
  const legends = [];
  const walk = (n) => {
    if (n.type === "TEXT" && / · \d+px$/.test(n.characters))
      legends.push(n.characters);
    n.children.forEach(walk);
  };
  walk(page.children[0]);
  t.true(legends.includes("component-height-100 · 32px"), legends.join("|"));
});
