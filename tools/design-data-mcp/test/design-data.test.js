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
import { createDesignDataTools } from "../src/tools/design-data.js";

const EXPECTED_TOOLS = [
  "design-data-primer",
  "design-data-query",
  "design-data-suggest",
  "design-data-component",
  "design-data-resolve",
];

test("createDesignDataTools exposes five CLI wrapper tools", (t) => {
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
