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
import { createDesignDataTools } from "../src/tools/design-data.js";

const EXPECTED_TOOLS = [
  "design-data-primer",
  "design-data-query",
  "design-data-suggest",
  "design-data-component",
  "design-data-resolve",
];

// ── design-data-suggest (wasm-backed) ────────────────────────────────────────

test("design-data-suggest returns ranked results in richer Rust shape", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const results = await tools["design-data-suggest"].handler({
    intent: "accent background color",
    limit: 5,
  });
  t.true(Array.isArray(results));
  t.true(results.length > 0);
  for (const r of results) {
    t.true(Object.hasOwn(r, "tokenName"), "result has tokenName");
    t.true(Object.hasOwn(r, "confidence"), "result has confidence");
    t.true(Object.hasOwn(r, "layer"), "result has layer");
    t.is(typeof r.confidence, "number");
    t.true(r.confidence > 0 && r.confidence <= 1);
  }
});

test("design-data-suggest respects limit", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const results = await tools["design-data-suggest"].handler({
    intent: "color",
    limit: 3,
  });
  t.true(results.length <= 3);
});

test("design-data-suggest returns empty array for unrecognised intent", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const results = await tools["design-data-suggest"].handler({
    intent: "zzz-no-match-xyzzy",
    limit: 5,
  });
  t.deepEqual(results, []);
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
