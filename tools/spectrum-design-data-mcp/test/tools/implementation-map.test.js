/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use it except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import test from "ava";
import { createImplementationMapTools } from "../../src/tools/implementation-map.js";

test("createImplementationMapTools returns array of tools", (t) => {
  const tools = createImplementationMapTools();
  t.true(Array.isArray(tools));
  t.true(tools.length >= 3);
});

test("implementation map tools have required properties", (t) => {
  const tools = createImplementationMapTools();

  for (const tool of tools) {
    t.is(typeof tool.name, "string");
    t.is(typeof tool.description, "string");
    t.is(typeof tool.inputSchema, "object");
    t.is(typeof tool.handler, "function");
  }
});

test("resolve-implementation tool exists", (t) => {
  const tools = createImplementationMapTools();
  const resolve = tools.find((tool) => tool.name === "resolve-implementation");
  t.truthy(resolve);
  t.true(resolve.inputSchema.required.includes("platform"));
  t.true(resolve.inputSchema.required.includes("tokenName"));
});

test("resolve-implementation returns style macro for known token", async (t) => {
  const tools = createImplementationMapTools();
  const resolve = tools.find((tool) => tool.name === "resolve-implementation");

  const result = await resolve.handler({
    platform: "react-spectrum",
    tokenName: "accent-background-color-default",
  });

  t.true(result.ok);
  t.is(result.platform, "react-spectrum");
  t.is(result.tokenName, "accent-background-color-default");
  t.deepEqual(result.styleMacro, {
    property: "backgroundColor",
    value: "accent",
  });
  t.true(result.usage.includes("backgroundColor"));
  t.true(result.usage.includes("accent"));
});

test("resolve-implementation returns style macro for font-size token", async (t) => {
  const tools = createImplementationMapTools();
  const resolve = tools.find((tool) => tool.name === "resolve-implementation");

  const result = await resolve.handler({
    platform: "react-spectrum",
    tokenName: "font-size-100",
  });

  t.true(result.ok);
  t.deepEqual(result.styleMacro, { property: "fontSize", value: "ui" });
});

test("resolve-implementation returns error for unknown token", async (t) => {
  const tools = createImplementationMapTools();
  const resolve = tools.find((tool) => tool.name === "resolve-implementation");

  const result = await resolve.handler({
    platform: "react-spectrum",
    tokenName: "nonexistent-token-name",
  });

  t.false(result.ok);
  t.truthy(result.message);
});

test("resolve-implementation returns error for missing params", async (t) => {
  const tools = createImplementationMapTools();
  const resolve = tools.find((tool) => tool.name === "resolve-implementation");

  const result = await resolve.handler({ platform: "react-spectrum" });
  t.false(result.ok);
  t.truthy(result.error);
});

test("resolve-implementation returns error for unsupported platform", async (t) => {
  const tools = createImplementationMapTools();
  const resolve = tools.find((tool) => tool.name === "resolve-implementation");

  const result = await resolve.handler({
    platform: "ios",
    tokenName: "accent-background-color-default",
  });

  t.false(result.ok);
  t.true(result.error.includes("Unsupported platform"));
});

test("reverse-lookup-implementation tool exists", (t) => {
  const tools = createImplementationMapTools();
  const reverse = tools.find(
    (tool) => tool.name === "reverse-lookup-implementation",
  );
  t.truthy(reverse);
  t.true(reverse.inputSchema.required.includes("platform"));
  t.true(reverse.inputSchema.required.includes("property"));
  t.true(reverse.inputSchema.required.includes("value"));
});

test("reverse-lookup-implementation finds token for style macro", async (t) => {
  const tools = createImplementationMapTools();
  const reverse = tools.find(
    (tool) => tool.name === "reverse-lookup-implementation",
  );

  const result = await reverse.handler({
    platform: "react-spectrum",
    property: "backgroundColor",
    value: "accent",
  });

  t.true(result.ok);
  t.is(result.property, "backgroundColor");
  t.is(result.value, "accent");
  t.true(result.tokenNames.includes("accent-background-color-default"));
});

test("reverse-lookup-implementation returns empty for unknown style value", async (t) => {
  const tools = createImplementationMapTools();
  const reverse = tools.find(
    (tool) => tool.name === "reverse-lookup-implementation",
  );

  const result = await reverse.handler({
    platform: "react-spectrum",
    property: "backgroundColor",
    value: "nonexistent-value",
  });

  t.true(result.ok);
  t.is(result.tokenNames.length, 0);
});

test("list-implementation-mappings tool exists", (t) => {
  const tools = createImplementationMapTools();
  const list = tools.find(
    (tool) => tool.name === "list-implementation-mappings",
  );
  t.truthy(list);
  t.true(list.inputSchema.required.includes("platform"));
});

test("list-implementation-mappings returns token names for react-spectrum", async (t) => {
  const tools = createImplementationMapTools();
  const list = tools.find(
    (tool) => tool.name === "list-implementation-mappings",
  );

  const result = await list.handler({ platform: "react-spectrum" });

  t.true(result.ok);
  t.is(result.platform, "react-spectrum");
  t.true(Array.isArray(result.tokenNames));
  t.true(result.count > 0);
  t.true(result.tokenNames.includes("accent-background-color-default"));
  t.true(result.tokenNames.includes("font-size-100"));
});
