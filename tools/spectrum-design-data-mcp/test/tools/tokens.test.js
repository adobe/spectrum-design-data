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

test("createTokenTools returns array of tools", (t) => {
  const tools = createTokenTools();
  t.true(Array.isArray(tools));
  t.true(tools.length > 0);
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

test("get-token-categories tool exists", (t) => {
  const tools = createTokenTools();
  const categoriesTool = tools.find(
    (tool) => tool.name === "get-token-categories",
  );

  t.truthy(categoriesTool);
  t.is(categoriesTool.name, "get-token-categories");
});

test("get-token-details tool exists", (t) => {
  const tools = createTokenTools();
  const detailsTool = tools.find((tool) => tool.name === "get-token-details");

  t.truthy(detailsTool);
  t.is(detailsTool.name, "get-token-details");
  t.true(detailsTool.inputSchema.required.includes("tokenPath"));
});
