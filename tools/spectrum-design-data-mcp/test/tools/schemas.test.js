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
import { createSchemaTools } from "../../src/tools/schemas.js";

test("createSchemaTools returns array of 4 tools", (t) => {
  const tools = createSchemaTools();
  t.true(Array.isArray(tools));
  t.is(tools.length, 4);
});

test("schema tools have required properties", (t) => {
  const tools = createSchemaTools();

  for (const tool of tools) {
    t.is(typeof tool.name, "string");
    t.is(typeof tool.description, "string");
    t.is(typeof tool.inputSchema, "object");
    t.is(typeof tool.handler, "function");
  }
});

test("get-component-schema tool exists", (t) => {
  const tools = createSchemaTools();
  const schemaTool = tools.find((tool) => tool.name === "get-component-schema");

  t.truthy(schemaTool);
  t.is(schemaTool.name, "get-component-schema");
  t.true(schemaTool.inputSchema.required.includes("component"));
});

test("list-components tool exists", (t) => {
  const tools = createSchemaTools();
  const listTool = tools.find((tool) => tool.name === "list-components");

  t.truthy(listTool);
  t.is(listTool.name, "list-components");
});

test("validate-component-props tool exists", (t) => {
  const tools = createSchemaTools();
  const validateTool = tools.find(
    (tool) => tool.name === "validate-component-props",
  );

  t.truthy(validateTool);
  t.is(validateTool.name, "validate-component-props");
  t.true(validateTool.inputSchema.required.includes("component"));
  t.true(validateTool.inputSchema.required.includes("props"));
});

test("list-components returns non-empty data", async (t) => {
  const tools = createSchemaTools();
  const listTool = tools.find((tool) => tool.name === "list-components");
  const result = await listTool.handler({});
  t.true(Array.isArray(result.components));
  t.true(result.components.length > 0);
  t.is(result.total, result.components.length);
});
