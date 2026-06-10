/**
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import test from "ava";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  insertDocumentBlocks,
  transformComponent,
} from "../src/transformer.js";

// ── insertDocumentBlocks ──────────────────────────────────────────────────────

test("insertDocumentBlocks inserts after meta, preserving key order", (t) => {
  const component = {
    $schema: "https://example.com/schema.json",
    name: "button",
    description: "A button.",
    meta: { category: "actions", documentationUrl: "https://example.com/" },
    options: [],
  };
  const blocks = [{ type: "purpose", content: "Enables actions." }];
  const result = insertDocumentBlocks(component, blocks);
  const keys = Object.keys(result);
  const metaIdx = keys.indexOf("meta");
  const dbIdx = keys.indexOf("documentBlocks");
  t.is(dbIdx, metaIdx + 1, "documentBlocks should immediately follow meta");
  t.deepEqual(result.documentBlocks, blocks);
  // All other keys still present
  t.truthy(result.$schema);
  t.truthy(result.options);
});

test("insertDocumentBlocks replaces existing documentBlocks without duplicating", (t) => {
  const component = {
    name: "button",
    meta: { category: "actions", documentationUrl: "https://example.com/" },
    documentBlocks: [{ type: "purpose", content: "Old content." }],
    options: [],
  };
  const newBlocks = [{ type: "purpose", content: "New content." }];
  const result = insertDocumentBlocks(component, newBlocks);
  t.is(result.documentBlocks.length, 1);
  t.is(result.documentBlocks[0].content, "New content.");
  // Should not contain two documentBlocks keys
  t.is(Object.keys(result).filter((k) => k === "documentBlocks").length, 1);
});

test("insertDocumentBlocks falls back to after description when meta absent", (t) => {
  const component = {
    name: "button",
    description: "A button.",
    options: [],
  };
  const blocks = [{ type: "purpose", content: "Enables actions." }];
  const result = insertDocumentBlocks(component, blocks);
  const keys = Object.keys(result);
  const descIdx = keys.indexOf("description");
  const dbIdx = keys.indexOf("documentBlocks");
  t.is(
    dbIdx,
    descIdx + 1,
    "documentBlocks should immediately follow description when meta absent",
  );
});

// ── transformComponent ────────────────────────────────────────────────────────

// Helper: create a temp dir with a minimal component JSON and a markdown doc.
function makeTempFixture(t, { markdown, componentJson }) {
  const dir = join(
    tmpdir(),
    `ava-transformer-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  const jsonPath = join(dir, "button.json");
  const mdPath = join(dir, "button.md");
  writeFileSync(jsonPath, JSON.stringify(componentJson, null, 2), "utf8");
  writeFileSync(mdPath, markdown, "utf8");
  t.teardown(() => rmSync(dir, { recursive: true, force: true }));
  return { jsonPath, mdPath };
}

test("transformComponent dryRun:true returns blocks but does not write the file", async (t) => {
  const originalJson = {
    name: "button",
    description: "A button.",
    meta: { category: "actions", documentationUrl: "https://example.com/" },
  };
  const markdown = `---
title: "Button"
---

# Button

## Overview

Buttons enable actions or navigation.
`;
  const { jsonPath, mdPath } = makeTempFixture(t, {
    markdown,
    componentJson: originalJson,
  });

  const result = await transformComponent(jsonPath, mdPath, { dryRun: true });

  t.true(result.changed, "changed should be true when blocks are produced");
  t.true(result.blocks.length > 0, "should have at least one block");

  // File should be unmodified
  const onDisk = JSON.parse(readFileSync(jsonPath, "utf8"));
  t.falsy(
    onDisk.documentBlocks,
    "file should not have been written in dry-run mode",
  );
});

test("transformComponent returns changed:false for stub pages", async (t) => {
  const originalJson = {
    name: "color-handle",
    description: "A color handle.",
    meta: { category: "inputs", documentationUrl: "https://example.com/" },
  };
  const stubMarkdown = `---
title: "Color Handle"
---

# Color Handle

Content should be scraped from the live site when VPN/browser access is available.
`;
  const { jsonPath, mdPath } = makeTempFixture(t, {
    markdown: stubMarkdown,
    componentJson: originalJson,
  });

  const result = await transformComponent(jsonPath, mdPath, { dryRun: true });

  t.false(result.changed, "changed should be false for stub pages");
  t.is(result.blocks.length, 0, "no blocks should be produced for stubs");
});
