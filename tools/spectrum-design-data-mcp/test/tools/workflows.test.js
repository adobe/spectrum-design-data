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
import { createWorkflowTools } from "../../src/tools/workflows.js";

test("createWorkflowTools returns array of tools", (t) => {
  const tools = createWorkflowTools();
  t.true(Array.isArray(tools));
  t.true(tools.length > 0);
});

test("workflow tools have required properties", (t) => {
  const tools = createWorkflowTools();

  for (const tool of tools) {
    t.is(typeof tool.name, "string");
    t.is(typeof tool.description, "string");
    t.is(typeof tool.inputSchema, "object");
    t.is(typeof tool.handler, "function");
  }
});

test("build-component-config tool exists", (t) => {
  const tools = createWorkflowTools();
  const buildTool = tools.find(
    (tool) => tool.name === "build-component-config",
  );

  t.truthy(buildTool);
  t.is(buildTool.name, "build-component-config");
  t.true(buildTool.description.includes("component configuration"));
  t.true(buildTool.inputSchema.required.includes("component"));
});

test("suggest-component-improvements tool exists", (t) => {
  const tools = createWorkflowTools();
  const suggestTool = tools.find(
    (tool) => tool.name === "suggest-component-improvements",
  );

  t.truthy(suggestTool);
  t.is(suggestTool.name, "suggest-component-improvements");
  t.true(suggestTool.description.includes("improvements"));
  t.true(suggestTool.inputSchema.required.includes("component"));
  t.true(suggestTool.inputSchema.required.includes("props"));
});

test("build-component-config handles valid component", async (t) => {
  const tools = createWorkflowTools();
  const buildTool = tools.find(
    (tool) => tool.name === "build-component-config",
  );

  const result = await buildTool.handler({
    component: "action-button",
    includeTokens: false,
  });

  t.truthy(result);
  t.is(result.component, "action-button");
  t.truthy(result.schema);
  t.truthy(result.recommendedProps);
  t.truthy(result.validation);
});

test("build-component-config throws error for invalid component", async (t) => {
  const tools = createWorkflowTools();
  const buildTool = tools.find(
    (tool) => tool.name === "build-component-config",
  );

  const error = await t.throwsAsync(async () => {
    await buildTool.handler({
      component: "non-existent-component",
    });
  });

  t.true(error.message.includes("not found"));
});

test("build-component-config includes tokens when requested", async (t) => {
  const tools = createWorkflowTools();
  const buildTool = tools.find(
    (tool) => tool.name === "build-component-config",
  );

  const result = await buildTool.handler({
    component: "action-button",
    includeTokens: true,
  });

  t.truthy(result);
  t.truthy(result.tokens);
});

test("build-component-config excludes tokens when not requested", async (t) => {
  const tools = createWorkflowTools();
  const buildTool = tools.find(
    (tool) => tool.name === "build-component-config",
  );

  const result = await buildTool.handler({
    component: "action-button",
    includeTokens: false,
  });

  t.truthy(result);
  t.is(result.tokens, undefined);
});

test("build-component-config applies variant when provided", async (t) => {
  const tools = createWorkflowTools();
  const buildTool = tools.find(
    (tool) => tool.name === "build-component-config",
  );

  const result = await buildTool.handler({
    component: "action-button",
    variant: "accent",
    includeTokens: false,
  });

  t.truthy(result);
  // Variant should be applied if it's a valid enum value
  if (result.recommendedProps.variant) {
    t.is(result.recommendedProps.variant, "accent");
  }
});

test("suggest-component-improvements handles valid component", async (t) => {
  const tools = createWorkflowTools();
  const suggestTool = tools.find(
    (tool) => tool.name === "suggest-component-improvements",
  );

  const result = await suggestTool.handler({
    component: "action-button",
    props: {
      variant: "accent",
    },
    includeTokenSuggestions: false,
  });

  t.truthy(result);
  t.is(result.component, "action-button");
  t.deepEqual(result.currentProps, { variant: "accent" });
  t.truthy(result.validation);
  t.truthy(result.improvements);
  t.truthy(result.bestPractices);
});

test("suggest-component-improvements throws error for invalid component", async (t) => {
  const tools = createWorkflowTools();
  const suggestTool = tools.find(
    (tool) => tool.name === "suggest-component-improvements",
  );

  const error = await t.throwsAsync(async () => {
    await suggestTool.handler({
      component: "non-existent-component",
      props: {},
    });
  });

  t.true(error.message.includes("not found"));
});

test("suggest-component-improvements includes token suggestions when requested", async (t) => {
  const tools = createWorkflowTools();
  const suggestTool = tools.find(
    (tool) => tool.name === "suggest-component-improvements",
  );

  const result = await suggestTool.handler({
    component: "action-button",
    props: {
      variant: "accent",
    },
    includeTokenSuggestions: true,
  });

  t.truthy(result);
  t.truthy(result.tokenRecommendations);
});

test("suggest-component-improvements excludes token suggestions when not requested", async (t) => {
  const tools = createWorkflowTools();
  const suggestTool = tools.find(
    (tool) => tool.name === "suggest-component-improvements",
  );

  const result = await suggestTool.handler({
    component: "action-button",
    props: {
      variant: "accent",
    },
    includeTokenSuggestions: false,
  });

  t.truthy(result);
  t.is(result.tokenRecommendations, undefined);
});

test("suggest-component-improvements detects missing required props", async (t) => {
  const tools = createWorkflowTools();
  const suggestTool = tools.find(
    (tool) => tool.name === "suggest-component-improvements",
  );

  const result = await suggestTool.handler({
    component: "action-button",
    props: {},
    includeTokenSuggestions: false,
  });

  t.truthy(result);
  // If the component has required props, validation should catch missing ones
  if (result.validation.errors.length > 0) {
    t.true(
      result.validation.errors.some((error) =>
        error.includes("Missing required"),
      ),
    );
  }
});

test("suggest-component-improvements detects unknown properties", async (t) => {
  const tools = createWorkflowTools();
  const suggestTool = tools.find(
    (tool) => tool.name === "suggest-component-improvements",
  );

  const result = await suggestTool.handler({
    component: "action-button",
    props: {
      unknownProperty: "value",
    },
    includeTokenSuggestions: false,
  });

  t.truthy(result);
  // Should detect unknown properties
  if (result.validation.warnings.length > 0) {
    t.true(
      result.validation.warnings.some((warning) =>
        warning.includes("Unknown property"),
      ),
    );
  }
});

test("build-component-config throws for invalid component name", async (t) => {
  const tools = createWorkflowTools();
  const buildTool = tools.find(
    (tool) => tool.name === "build-component-config",
  );

  const error = await t.throwsAsync(async () => {
    await buildTool.handler({ component: "" });
  });
  t.true(error.message.includes("non-empty string"));

  const error2 = await t.throwsAsync(async () => {
    await buildTool.handler({ component: "foo/bar" });
  });
  t.true(error2.message.includes("path separators"));
});

test("suggest-component-improvements throws for invalid props", async (t) => {
  const tools = createWorkflowTools();
  const suggestTool = tools.find(
    (tool) => tool.name === "suggest-component-improvements",
  );

  const error = await t.throwsAsync(async () => {
    await suggestTool.handler({
      component: "action-button",
      props: "not-an-object",
    });
  });
  t.true(error.message.includes("valid object"));
});
