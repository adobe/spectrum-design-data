// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { tmpdir } from "node:os";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  createDesignDataTools,
  scoreTokensByKeyword,
} from "../src/tools/design-data.js";

const EXPECTED_TOOLS = [
  "design-data-primer",
  "design-data-query",
  "design-data-suggest",
  "design-data-component",
  "design-data-resolve",
];

// ── scoreTokensByKeyword ─────────────────────────────────────────────────────

const FIXTURE_TOKENS = [
  { name: "accent-background-color-default", uuid: "aaa-001", raw: null },
  { name: "accent-border-color-default", uuid: "aaa-002", raw: null },
  { name: "neutral-background-color-default", uuid: "aaa-003", raw: null },
  { name: "spacing-100", uuid: "aaa-004", raw: null },
  { name: "font-size-100", uuid: "aaa-005", raw: null },
];

test("scoreTokensByKeyword returns matches ranked by confidence", (t) => {
  const results = scoreTokensByKeyword(
    FIXTURE_TOKENS,
    "accent background color",
    10,
  );
  t.true(results.length > 0);
  // First result should be 'accent-background-color-default' (3/3 words match)
  t.is(results[0].name, "accent-background-color-default");
  t.is(results[0].confidence, 1);
});

test("scoreTokensByKeyword respects the limit", (t) => {
  const results = scoreTokensByKeyword(FIXTURE_TOKENS, "color", 2);
  t.is(results.length, 2);
});

test("scoreTokensByKeyword returns empty array when no tokens match", (t) => {
  const results = scoreTokensByKeyword(FIXTURE_TOKENS, "zzz-no-match");
  t.deepEqual(results, []);
});

test("scoreTokensByKeyword returns empty array for empty intent", (t) => {
  const results = scoreTokensByKeyword(FIXTURE_TOKENS, "");
  t.deepEqual(results, []);
});

test("scoreTokensByKeyword result includes name, confidence, uuid, raw", (t) => {
  const results = scoreTokensByKeyword(FIXTURE_TOKENS, "accent");
  t.true(results.length > 0);
  for (const r of results) {
    t.true(Object.hasOwn(r, "name"));
    t.true(Object.hasOwn(r, "confidence"));
    t.true(Object.hasOwn(r, "uuid"));
    t.true(Object.hasOwn(r, "raw"));
    t.is(typeof r.confidence, "number");
  }
});

// ── component not-found error ────────────────────────────────────────────────

const TMP = join(tmpdir(), "design-data-mcp-test-" + randomUUID().slice(0, 8));

test.before(() => mkdirSync(TMP, { recursive: true }));
test.after(() => rmSync(TMP, { recursive: true, force: true }));

test("design-data-component throws for unknown component id", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const tool = tools["design-data-component"];
  // This test relies on the package being unavailable in the test env for a
  // fake component ID, or the component JSON not existing.
  const err = await t.throwsAsync(() =>
    tool.handler({ id: "zzz-nonexistent-component-xyz" }),
  );
  t.truthy(err);
  t.true(
    err.message.includes("zzz-nonexistent-component-xyz") ||
      err.message.includes("not installed"),
    `Expected error about missing component, got: ${err.message}`,
  );
});

// ── structural tests ──────────────────────────────────────────────────────────

test("createDesignDataTools exposes five wasm-backed tools", (t) => {
  const tools = createDesignDataTools();
  t.is(tools.length, 5);
  t.deepEqual(
    tools.map(({ name }) => name),
    EXPECTED_TOOLS,
  );
});

test("each tool schema rejects unknown properties", (t) => {
  for (const tool of createDesignDataTools()) {
    t.is(
      tool.inputSchema.additionalProperties,
      false,
      `${tool.name} should set additionalProperties: false`,
    );
  }
});

test("query and resolve require their primary argument", (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );

  t.deepEqual(tools["design-data-query"].inputSchema.required, ["filter"]);
  t.deepEqual(tools["design-data-resolve"].inputSchema.required, ["property"]);
});
