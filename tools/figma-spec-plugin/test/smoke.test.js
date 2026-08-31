// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * code.js only runs inside the real Figma plugin sandbox, so this can't drive an actual
 * render — but its layout logic (page/frame naming, idempotent re-render) is plain
 * object manipulation once the `figma` global is stubbed. Runs code.js in a sandboxed
 * vm with a minimal fake `figma`/`__html__`, feeds it the checked-in sample accordion
 * spec twice, and asserts the second render replaces rather than duplicates frames —
 * the property renderGroup's `existing.remove()` is meant to guarantee.
 */
import test from "ava";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const code = readFileSync(join(__dirname, "../code.js"), "utf-8");
const sampleSpec = JSON.parse(
  readFileSync(join(__dirname, "../sample-accordion-spec.json"), "utf-8"),
);

function makeNode(type, parentChildren) {
  const node = { type, children: [], removed: false };
  node.appendChild = (child) => node.children.push(child);
  // Mirrors real Figma: remove() actually detaches the node from its parent, so a
  // later findOne() by name can't still match it. `pages` is passed as the parent
  // list only for top-level page nodes; frames are removed via their page's array.
  node.remove = () => {
    node.removed = true;
    if (parentChildren) {
      const i = parentChildren.indexOf(node);
      if (i !== -1) parentChildren.splice(i, 1);
    }
  };
  return node;
}

function makeFigmaMock() {
  const pages = [];
  const uiMessages = [];
  const figma = {
    root: { children: pages },
    currentPage: null,
    showUI() {},
    ui: {
      onmessage: null,
      postMessage(msg) {
        uiMessages.push(msg);
      },
    },
    loadFontAsync: async () => {},
    createPage() {
      const page = makeNode("PAGE", pages);
      page.name = "";
      page.findOne = (predicate) => page.children.find(predicate) || null;
      pages.push(page);
      return page;
    },
    createFrame() {
      // The frame doesn't know its parent page until appendChild runs; renderGroup's
      // page.appendChild(frame) happens after this returns, so wire removal through a
      // closure that always reads whichever page currently holds it.
      const node = makeNode("FRAME");
      node.remove = () => {
        node.removed = true;
        for (const page of pages) {
          const i = page.children.indexOf(node);
          if (i !== -1) page.children.splice(i, 1);
        }
      };
      return node;
    },
    createText() {
      const node = makeNode("TEXT");
      node.fontName = null;
      node.fontSize = null;
      node.characters = "";
      return node;
    },
  };
  return { figma, uiMessages };
}

async function runRender(figma) {
  await figma.ui.onmessage({ type: "render-spec", spec: sampleSpec });
}

test("renders once, cleanly", async (t) => {
  const { figma, uiMessages } = makeFigmaMock();
  vm.runInNewContext(code, { figma, __html__: "" });

  await runRender(figma);

  const page = figma.root.children[0];
  t.truthy(page);
  t.true(page.children.length > 0);
  t.is(page.children.filter((n) => !n.removed).length, page.children.length);
  const result = uiMessages.find((m) => m.type === "render-complete").result;
  t.is(result.groupsRendered, page.children.length);
});

test("re-rendering the same spec replaces frames instead of duplicating them", async (t) => {
  const { figma } = makeFigmaMock();
  vm.runInNewContext(code, { figma, __html__: "" });

  await runRender(figma);
  const page = figma.root.children[0];
  const firstRunFrameCount = page.children.filter((n) => !n.removed).length;

  await runRender(figma);
  const liveFrames = page.children.filter((n) => !n.removed);
  const names = liveFrames.map((n) => n.name);

  t.is(
    liveFrames.length,
    firstRunFrameCount,
    "second render should not add extra live frames",
  );
  t.is(
    new Set(names).size,
    names.length,
    "no duplicate frame names among live frames",
  );
});
