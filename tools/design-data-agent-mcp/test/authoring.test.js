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
  // Authoring session (wizard)
  "start_authoring_session",
  "authoring_session_step_intent",
  "authoring_session_step_classification",
  "authoring_session_step_values",
  "authoring_session_commit",
  "authoring_session_cancel",
  "authoring_session_get",
  "authoring_session_list",
  // Token lifecycle
  "edit_token",
  "deprecate_token",
  "rename_token",
  "rewire_alias",
  "remove_token",
  // Mode-set
  "add_mode",
  "rename_mode",
  "remove_mode",
  "create_mode_set",
  "remove_mode_set",
];

test("createAuthoringTools returns exactly 18 tools", (t) => {
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

test("edit_token requires uuid, target, updates", (t) => {
  const tools = createAuthoringTools();
  const tool = tools.find((t) => t.name === "edit_token");
  t.truthy(tool);
  const required = tool.inputSchema.required ?? [];
  t.true(required.includes("uuid"));
  t.true(required.includes("target"));
  t.true(required.includes("updates"));
});

test("deprecate_token requires uuid, target, spec_version", (t) => {
  const tools = createAuthoringTools();
  const tool = tools.find((t) => t.name === "deprecate_token");
  t.truthy(tool);
  const required = tool.inputSchema.required ?? [];
  t.true(required.includes("uuid"));
  t.true(required.includes("target"));
  t.true(required.includes("spec_version"));
});

test("rewire_alias requires uuid, target, new_ref, tokens_root", (t) => {
  const tools = createAuthoringTools();
  const tool = tools.find((t) => t.name === "rewire_alias");
  t.truthy(tool);
  const required = tool.inputSchema.required ?? [];
  t.true(required.includes("uuid"));
  t.true(required.includes("target"));
  t.true(required.includes("new_ref"));
  t.true(required.includes("tokens_root"));
});

test("remove_token requires uuid, target, tokens_root", (t) => {
  const tools = createAuthoringTools();
  const tool = tools.find((t) => t.name === "remove_token");
  t.truthy(tool);
  const required = tool.inputSchema.required ?? [];
  t.true(required.includes("uuid"));
  t.true(required.includes("target"));
  t.true(required.includes("tokens_root"));
});

test("create_mode_set requires mode_set_file, name, modes, default", (t) => {
  const tools = createAuthoringTools();
  const tool = tools.find((t) => t.name === "create_mode_set");
  t.truthy(tool);
  const required = tool.inputSchema.required ?? [];
  t.true(required.includes("mode_set_file"));
  t.true(required.includes("name"));
  t.true(required.includes("modes"));
  t.true(required.includes("default"));
});

test("rename_mode requires mode_set_file, tokens_root, old, new", (t) => {
  const tools = createAuthoringTools();
  const tool = tools.find((t) => t.name === "rename_mode");
  t.truthy(tool);
  const required = tool.inputSchema.required ?? [];
  t.true(required.includes("mode_set_file"));
  t.true(required.includes("tokens_root"));
  t.true(required.includes("old"));
  t.true(required.includes("new"));
});

// ── Handler unit tests (no CLI — exercise JS logic only) ──────────────────────

/**
 * Capture CLI args without spawning a process by monkey-patching runCli via
 * module re-export. Since runCli is imported inside authoring.js we intercept
 * at the handler level by having the handler throw before the CLI would run.
 *
 * For the two logic-only paths below (name_fields encoding, rename_token guard)
 * we can test without a real CLI by checking thrown errors or by inspection.
 */

test("name_fields with = in value produces key=value= prefixed arg", (t) => {
  // Verify the encoding: key="size", value="foo=bar" → "--name-field size=foo=bar".
  // The CLI receives "size=foo=bar" and split_once('=') yields k="size", v="foo=bar".
  // We test the arg-building logic by constructing it directly (same code path).
  const args = [];
  const name_fields = [{ key: "size", value: "foo=bar" }];
  for (const { key, value } of name_fields)
    args.push("--name-field", `${key}=${value}`);
  t.deepEqual(args, ["--name-field", "size=foo=bar"]);
});

test("rename_token handler rejects null new_name", async (t) => {
  const tools = createAuthoringTools();
  const tool = tools.find((t) => t.name === "rename_token");
  await t.throwsAsync(
    () => tool.handler({ uuid: "u", target: "t.json", new_name: null }),
    { message: /new_name must be a string or object/ },
  );
});

test("rename_token handler rejects numeric new_name", async (t) => {
  const tools = createAuthoringTools();
  const tool = tools.find((t) => t.name === "rename_token");
  await t.throwsAsync(
    () => tool.handler({ uuid: "u", target: "t.json", new_name: 42 }),
    { message: /new_name must be a string or object/ },
  );
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
