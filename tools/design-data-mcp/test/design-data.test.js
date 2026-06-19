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
  "design-data-guideline-list",
  "design-data-guideline",
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

// ── design-data-guideline-list ────────────────────────────────────────────────

test("design-data-guideline-list returns catalog with guidelines array", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const result = await tools["design-data-guideline-list"].handler({});
  t.true(
    Array.isArray(result.guidelines),
    "result.guidelines should be an array",
  );
  t.is(typeof result.total, "number");
  t.true(result.total > 0, "should have at least one guideline");
  // Each entry has the expected catalog shape
  for (const entry of result.guidelines) {
    t.true(typeof entry.slug === "string", "entry.slug should be a string");
    t.true(typeof entry.title === "string", "entry.title should be a string");
    t.true(
      typeof entry.category === "string",
      "entry.category should be a string",
    );
  }
});

test("design-data-guideline-list filters by category", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const result = await tools["design-data-guideline-list"].handler({
    category: "designing",
  });
  t.true(result.guidelines.every((g) => g.category === "designing"));
});

test("design-data-guideline-list total matches guidelines length", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const result = await tools["design-data-guideline-list"].handler({});
  t.is(result.total, result.guidelines.length);
});

// ── design-data-guideline ─────────────────────────────────────────────────────

test("design-data-guideline returns a guideline document with documentBlocks", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const result = await tools["design-data-guideline"].handler({ id: "colors" });
  t.is(result.name, "colors");
  t.truthy(result.title);
  t.truthy(result.category);
  t.true(Array.isArray(result.documentBlocks));
  t.true(
    result.documentBlocks.length > 0,
    "colors should have at least one block",
  );
  for (const block of result.documentBlocks) {
    t.truthy(block.type, "each block has a type");
    t.truthy(block.content, "each block has content");
  }
});

test("design-data-guideline throws for unknown guideline id", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const err = await t.throwsAsync(() =>
    tools["design-data-guideline"].handler({ id: "zzz-nonexistent-guideline" }),
  );
  t.truthy(err);
  t.true(
    err.message.includes("zzz-nonexistent-guideline") ||
      err.message.includes("not installed"),
    `Expected error about missing guideline, got: ${err.message}`,
  );
});

// ── MCP tool annotations ──────────────────────────────────────────────────────

test("each tool has required MCP annotations", (t) => {
  for (const tool of createDesignDataTools()) {
    t.truthy(tool.annotations, `${tool.name} should have annotations`);
    t.is(
      typeof tool.annotations.title,
      "string",
      `${tool.name} annotations.title should be a string`,
    );
    t.true(
      tool.annotations.title.length > 0,
      `${tool.name} annotations.title should be non-empty`,
    );
    t.is(
      tool.annotations.readOnlyHint,
      true,
      `${tool.name} readOnlyHint should be true`,
    );
    t.is(
      tool.annotations.openWorldHint,
      false,
      `${tool.name} openWorldHint should be false`,
    );
  }
});

// ── structural tests ──────────────────────────────────────────────────────────

test("createDesignDataTools exposes seven tools", (t) => {
  const tools = createDesignDataTools();
  t.is(tools.length, 7);
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

test("design-data-component and design-data-guideline require id", (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );

  t.deepEqual(tools["design-data-component"].inputSchema.required, ["id"]);
  t.deepEqual(tools["design-data-guideline"].inputSchema.required, ["id"]);
});

test("design-data-guideline-list category is not required", (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const schema = tools["design-data-guideline-list"].inputSchema;
  t.falsy(schema.required, "category should not be required");
});

// ── design-data-primer provenance ────────────────────────────────────────────

test("design-data-primer returns provenance with designDataVersion", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const result = await tools["design-data-primer"].handler({});
  t.truthy(result.provenance, "provenance should be present");
  t.is(
    result.provenance.source,
    "embedded",
    "provenance.source should be 'embedded'",
  );
  t.is(
    typeof result.provenance.designDataVersion,
    "string",
    "provenance.designDataVersion should be a string",
  );
  t.regex(
    result.provenance.designDataVersion,
    /^\d+\.\d+\.\d+/,
    "provenance.designDataVersion should look like a semver",
  );
});
