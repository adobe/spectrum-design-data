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

test("createSchemaTools returns array of tools", (t) => {
  const tools = createSchemaTools();
  t.true(Array.isArray(tools));
  t.true(tools.length > 0);
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

test("query-component-schemas tool exists", (t) => {
  const tools = createSchemaTools();
  const queryTool = tools.find(
    (tool) => tool.name === "query-component-schemas",
  );

  t.truthy(queryTool);
  t.is(queryTool.name, "query-component-schemas");
  t.true(queryTool.description.includes("Search"));
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

test("get-type-schemas tool exists", (t) => {
  const tools = createSchemaTools();
  const typesTool = tools.find((tool) => tool.name === "get-type-schemas");

  t.truthy(typesTool);
  t.is(typesTool.name, "get-type-schemas");
});
