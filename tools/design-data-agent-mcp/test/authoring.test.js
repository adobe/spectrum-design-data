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
import { createAuthoringTools } from "../src/tools/authoring.js";

const EXPECTED_TOOL_NAMES = [
  "start_authoring_session",
  "authoring_session_step_intent",
  "authoring_session_step_classification",
  "authoring_session_step_values",
  "authoring_session_commit",
  "authoring_session_cancel",
  "authoring_session_get",
  "authoring_session_list",
];

test("createAuthoringTools returns exactly 8 tools", (t) => {
  const tools = createAuthoringTools();
  t.is(tools.length, EXPECTED_TOOL_NAMES.length);
});

test("all expected authoring tool names are present", (t) => {
  const tools = createAuthoringTools();
  const names = tools.map((tool) => tool.name);
  for (const expected of EXPECTED_TOOL_NAMES) {
    t.true(names.includes(expected), `missing tool: ${expected}`);
  }
});

test("each tool has name, description, inputSchema, and handler", (t) => {
  const tools = createAuthoringTools();
  for (const tool of tools) {
    t.truthy(tool.name, `${tool.name}: missing name`);
    t.true(
      typeof tool.description === "string" && tool.description.length > 0,
      `${tool.name}: missing description`,
    );
    t.truthy(tool.inputSchema, `${tool.name}: missing inputSchema`);
    t.is(
      typeof tool.handler,
      "function",
      `${tool.name}: handler must be a function`,
    );
  }
});

test("start_authoring_session inputSchema has dataset_path property", (t) => {
  const tools = createAuthoringTools();
  const tool = tools.find((t) => t.name === "start_authoring_session");
  t.truthy(tool);
  t.truthy(tool.inputSchema.properties.dataset_path);
});

test("authoring_session_commit requires session_id, schema_url, target", (t) => {
  const tools = createAuthoringTools();
  const tool = tools.find((t) => t.name === "authoring_session_commit");
  t.truthy(tool);
  const required = tool.inputSchema.required ?? [];
  t.true(required.includes("session_id"));
  t.true(required.includes("schema_url"));
  t.true(required.includes("target"));
});

test("authoring_session_step_intent requires session_id and intent", (t) => {
  const tools = createAuthoringTools();
  const tool = tools.find((t) => t.name === "authoring_session_step_intent");
  t.truthy(tool);
  const required = tool.inputSchema.required ?? [];
  t.true(required.includes("session_id"));
  t.true(required.includes("intent"));
});

test("all inputSchemas have additionalProperties: false", (t) => {
  const tools = createAuthoringTools();
  for (const tool of tools) {
    t.false(
      tool.inputSchema.additionalProperties,
      `${tool.name}: inputSchema should have additionalProperties: false`,
    );
  }
});
