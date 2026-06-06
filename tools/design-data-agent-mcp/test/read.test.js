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
import { config } from "../src/config.js";
import { createReadTools } from "../src/tools/read.js";

// ── helpers ────────────────────────────────────────────────────────────────────

function getHandler(name) {
  const tools = createReadTools();
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool "${name}" not found`);
  return tool.handler.bind(tool);
}

// ── primer ─────────────────────────────────────────────────────────────────────

test("primer returns expected top-level keys", async (t) => {
  const primer = getHandler("primer");
  const result = await primer();
  t.is(typeof result.tokenCount, "number");
  t.true(result.tokenCount > 0, "tokenCount should be positive");
  t.truthy(result.modeSets, "modeSets should be present");
  t.true(
    Array.isArray(result.modeSets.colorScheme),
    "modeSets.colorScheme is an array",
  );
  t.true(Array.isArray(result.modeSets.scale), "modeSets.scale is an array");
  t.true(
    Array.isArray(result.modeSets.contrast),
    "modeSets.contrast is an array",
  );
  t.truthy(result.taxonomyFields, "taxonomyFields should be present");
  t.true(Array.isArray(result.components), "components is an array");
  t.true(result.components.length > 0, "components should be non-empty");
  t.true(Array.isArray(result.properties), "properties is an array");
  t.is(result.source, "embedded");
});

test("primer does not require a CLI binary (no runCli import)", async (t) => {
  // Structural check: the compiled source of read.js must not import cli.js
  const src = await import("fs").then((fs) =>
    fs.promises.readFile(
      new URL("../src/tools/read.js", import.meta.url),
      "utf-8",
    ),
  );
  t.false(src.includes("runCli"), "read.js must not reference runCli");
  t.false(src.includes('../cli.js"'), "read.js must not import cli.js");
});

// ── describe_component ─────────────────────────────────────────────────────────

test("describe_component returns component data for a known ID", async (t) => {
  const describe = getHandler("describe_component");
  const result = await describe({ id: "button" });
  t.is(typeof result, "object", "result should be an object");
  t.truthy(result, "result should be non-null");
  // All component files have at least a name/id field
  t.true(
    typeof result.id === "string" || typeof result.name === "string",
    "result should have an id or name field",
  );
});

test("describe_component rejects path-traversal ID (../foo)", async (t) => {
  const describe = getHandler("describe_component");
  const err = await t.throwsAsync(() => describe({ id: "../foo" }));
  t.true(err.message.includes("Invalid component ID"), `got: ${err.message}`);
});

test("describe_component rejects ID with uppercase letters", async (t) => {
  const describe = getHandler("describe_component");
  const err = await t.throwsAsync(() => describe({ id: "Button" }));
  t.true(err.message.includes("Invalid component ID"), `got: ${err.message}`);
});

test("describe_component rejects empty ID", async (t) => {
  const describe = getHandler("describe_component");
  const err = await t.throwsAsync(() => describe({ id: "" }));
  t.true(err.message.includes("Invalid component ID"), `got: ${err.message}`);
});

test("describe_component rejects ID with path separator", async (t) => {
  const describe = getHandler("describe_component");
  const err = await t.throwsAsync(() => describe({ id: "a/b" }));
  t.true(err.message.includes("Invalid component ID"), `got: ${err.message}`);
});

test("describe_component not-found error lists available component IDs", async (t) => {
  const describe = getHandler("describe_component");
  const err = await t.throwsAsync(() =>
    describe({ id: "zzz-nonexistent-xyz" }),
  );
  t.true(err.message.includes("not found"), `got: ${err.message}`);
  // Should list real available components or fall back to a hint
  t.true(
    err.message.includes("button") || err.message.includes("primer"),
    `error should list available components or suggest primer, got: ${err.message}`,
  );
});

test("describe_component throws helpful error when componentsDir is null", async (t) => {
  // Simulates a zero-config install where @adobe/spectrum-design-data is absent.
  const saved = config.componentsDir;
  t.teardown(() => {
    config.componentsDir = saved;
  });
  config.componentsDir = null;

  const describe = getHandler("describe_component");
  const err = await t.throwsAsync(() => describe({ id: "button" }));
  t.true(
    err.message.includes("not installed"),
    `expected 'not installed', got: ${err.message}`,
  );
});

test("primer shape contract: SKILL.md fields are all present", async (t) => {
  // Guards the contract described in SKILL.md: "returns the active dimensions,
  // component list, taxonomy fields, and token count". If this shape changes,
  // update the SKILL.md prompt accordingly.
  const primer = getHandler("primer");
  const result = await primer();
  // active dimensions
  t.true("colorScheme" in result.modeSets, "modeSets.colorScheme");
  t.true("scale" in result.modeSets, "modeSets.scale");
  t.true("contrast" in result.modeSets, "modeSets.contrast");
  // component list
  t.true(
    result.components.includes("button"),
    "components[] includes 'button'",
  );
  // taxonomy fields
  t.true("indexed" in result.taxonomyFields, "taxonomyFields.indexed");
  t.true("advisory" in result.taxonomyFields, "taxonomyFields.advisory");
  // token count
  t.is(typeof result.tokenCount, "number");
});
