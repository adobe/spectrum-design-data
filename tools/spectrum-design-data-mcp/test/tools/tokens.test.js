/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import test from "ava";
import { createTokenTools } from "../../src/tools/tokens.js";

test("createTokenTools returns array of 7 tools", (t) => {
  const tools = createTokenTools();
  t.true(Array.isArray(tools));
  t.is(tools.length, 7);
});

test("token tools have required properties", (t) => {
  const tools = createTokenTools();

  for (const tool of tools) {
    t.is(typeof tool.name, "string");
    t.is(typeof tool.description, "string");
    t.is(typeof tool.inputSchema, "object");
    t.is(typeof tool.handler, "function");
  }
});

test("query-tokens tool exists", (t) => {
  const tools = createTokenTools();
  const queryTool = tools.find((tool) => tool.name === "query-tokens");

  t.truthy(queryTool);
  t.is(queryTool.name, "query-tokens");
  t.true(queryTool.description.includes("Search"));
});

test("get-token-details tool exists", (t) => {
  const tools = createTokenTools();
  const detailsTool = tools.find((tool) => tool.name === "get-token-details");

  t.truthy(detailsTool);
  t.is(detailsTool.name, "get-token-details");
  t.true(detailsTool.inputSchema.required.includes("tokenPath"));
});

test("query-tokens-by-value tool exists with value and limit", (t) => {
  const tools = createTokenTools();
  const valueTool = tools.find((tool) => tool.name === "query-tokens-by-value");

  t.truthy(valueTool);
  t.is(valueTool.name, "query-tokens-by-value");
  t.true("value" in valueTool.inputSchema.properties);
  t.true("limit" in valueTool.inputSchema.properties);
  t.true(valueTool.inputSchema.required.includes("value"));
});

test("query-tokens returns non-empty results for 'border'", async (t) => {
  const tools = createTokenTools();
  const queryTool = tools.find((tool) => tool.name === "query-tokens");
  const result = await queryTool.handler({ query: "border", limit: 10 });
  t.true(Array.isArray(result.tokens));
  t.true(result.tokens.length > 0);
  t.is(result.total, result.tokens.length);
});

test("query-tokens-by-value respects limit", async (t) => {
  const tools = createTokenTools();
  const valueTool = tools.find((tool) => tool.name === "query-tokens-by-value");
  const result = await valueTool.handler({
    value: "px",
    exact: false,
    limit: 5,
  });
  t.true(Array.isArray(result.tokens));
  t.true(result.tokens.length <= 5);
  t.is(result.total, result.tokens.length);
});

test("query-tokens-by-value '1px' returns border-width-100 with matchType direct", async (t) => {
  const tools = createTokenTools();
  const valueTool = tools.find((tool) => tool.name === "query-tokens-by-value");
  const result = await valueTool.handler({ value: "1px" });
  const borderToken = result.tokens.find(
    (tok) => tok.name === "border-width-100",
  );
  t.truthy(borderToken);
  t.is(borderToken.matchType, "direct");
  t.is(borderToken.resolvedValue, "1px");
});

test("query-tokens-by-value '1px' returns picker-border-width with matchType alias", async (t) => {
  const tools = createTokenTools();
  const valueTool = tools.find((tool) => tool.name === "query-tokens-by-value");
  const result = await valueTool.handler({ value: "1px" });
  const pickerToken = result.tokens.find(
    (tok) => tok.name === "picker-border-width",
  );
  t.truthy(pickerToken);
  t.is(pickerToken.matchType, "alias");
  t.is(pickerToken.resolvedValue, "1px");
});

test("query-tokens-by-value non-existent value returns empty tokens", async (t) => {
  const tools = createTokenTools();
  const valueTool = tools.find((tool) => tool.name === "query-tokens-by-value");
  const result = await valueTool.handler({
    value: "nonexistent-value-xyz-12345",
  });
  t.true(Array.isArray(result.tokens));
  t.is(result.tokens.length, 0);
  t.is(result.total, 0);
});
