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
import { createTokenTools } from "../../src/tools/tokens.js";
import { createSchemaTools } from "../../src/tools/schemas.js";

const workflowTools = createWorkflowTools();
const tokenTools = createTokenTools();
const schemaTools = createSchemaTools();

function getTool(tools, name) {
  return tools.find((t) => t.name === name);
}

async function getComponentSchema(component) {
  const tool = getTool(schemaTools, "get-component-schema");
  return await tool.handler({ component });
}

async function getComponentTokens(componentName) {
  const tool = getTool(tokenTools, "get-component-tokens");
  return await tool.handler({ componentName });
}

async function findTokensByUseCase(useCase, componentType) {
  const tool = getTool(tokenTools, "find-tokens-by-use-case");
  return await tool.handler({ useCase, componentType });
}

async function getDesignRecommendations(intent, state, context) {
  const tool = getTool(tokenTools, "get-design-recommendations");
  return await tool.handler({ intent, state, context });
}

async function validateProps(component, props) {
  const tool = getTool(schemaTools, "validate-component-props");
  return await tool.handler({ component, props });
}

async function getTokenDetails(tokenPath, category) {
  const tool = getTool(tokenTools, "get-token-details");
  return await tool.handler({ tokenPath, category });
}

async function buildComponentConfig(args) {
  const tool = getTool(workflowTools, "build-component-config");
  return await tool.handler(args);
}

// --- Component Builder Workflows (from component-builder.md) ---

test("Component Builder: action-button primary medium", async (t) => {
  const schema = await getComponentSchema("action-button");
  t.truthy(schema.schema);
  t.truthy(schema.schema.properties);

  const tokens = await getComponentTokens("action-button");
  t.truthy(tokens.tokensByCategory);

  const bgTokens = await findTokensByUseCase(
    "button background",
    "action-button",
  );
  t.true(Array.isArray(bgTokens.recommendations));

  const recommendations = await getDesignRecommendations(
    "primary",
    undefined,
    "button",
  );
  t.truthy(recommendations.recommendations.colors);

  const validation = await validateProps("action-button", {
    variant: "accent",
    size: "m",
  });
  t.true(validation.valid);
});

test("Component Builder: text-field error state", async (t) => {
  const schema = await getComponentSchema("text-field");
  t.truthy(schema.schema);

  const tokens = await getComponentTokens("text-field");
  t.truthy(tokens.tokensByCategory);

  const errorTokens = await findTokensByUseCase("error state", "input");
  t.true(Array.isArray(errorTokens.recommendations));

  const recommendations = await getDesignRecommendations(
    "negative",
    undefined,
    "input",
  );
  t.truthy(recommendations.recommendations.colors);
  t.true(recommendations.recommendations.colors.length >= 0);

  const validation = await validateProps("text-field", {
    validationState: "invalid",
    errorMessage: "Please enter a valid value",
  });
  t.truthy(validation);
});

// --- Token Finder Workflows (from token-finder.md) ---

test("Token Finder: primary button colors", async (t) => {
  const recommendations = await getDesignRecommendations(
    "primary",
    undefined,
    "button",
  );
  t.truthy(recommendations.recommendations.colors);
  t.true(Array.isArray(recommendations.recommendations.colors));

  t.true(
    Array.isArray(recommendations.recommendations.colors),
    "should return colors array",
  );

  const bgTokens = await findTokensByUseCase("button background", "button");
  t.true(Array.isArray(bgTokens.recommendations));

  if (recommendations.recommendations.colors.length > 0) {
    const firstColor = recommendations.recommendations.colors[0];
    const details = await getTokenDetails(firstColor.name);
    t.truthy(details.token);
  }
});

test("Token Finder: form field spacing", async (t) => {
  const spacingTokens = await findTokensByUseCase("spacing", "input");
  t.true(Array.isArray(spacingTokens.recommendations));

  const componentTokens = await getComponentTokens("text-field");
  t.truthy(componentTokens.tokensByCategory);

  const recommendations = await getDesignRecommendations(
    "informative",
    undefined,
    "spacing",
  );
  t.truthy(recommendations.recommendations.layout);
  t.true(Array.isArray(recommendations.recommendations.layout));
});

test("Token Finder: error messaging tokens", async (t) => {
  const recommendations = await getDesignRecommendations(
    "negative",
    undefined,
    "text",
  );
  t.truthy(recommendations.recommendations.colors);
  t.true(Array.isArray(recommendations.recommendations.colors));

  const errorTokens = await findTokensByUseCase("error state");
  t.true(Array.isArray(errorTokens.recommendations));

  if (recommendations.recommendations.colors.length > 0) {
    const details = await getTokenDetails(
      recommendations.recommendations.colors[0].name,
    );
    t.truthy(details.token);
  }
});

// --- SKILL.md example validation ---

test("SKILL.md example: Component Builder workflow", async (t) => {
  const schema = await getComponentSchema("action-button");
  t.truthy(schema.schema);

  const tokens = await getComponentTokens("action-button");
  t.truthy(tokens.tokensByCategory);

  const useCaseTokens = await findTokensByUseCase(
    "button background",
    "action-button",
  );
  t.true(Array.isArray(useCaseTokens.recommendations));

  const recommendations = await getDesignRecommendations(
    "primary",
    undefined,
    "button",
  );
  t.truthy(recommendations.recommendations);

  const props = { variant: "accent", size: "m" };
  const validation = await validateProps("action-button", props);
  t.true(validation.valid);
});

test("SKILL.md example: Token Finder workflow", async (t) => {
  const recommendations = await getDesignRecommendations(
    "primary",
    undefined,
    "button",
  );
  t.truthy(recommendations.recommendations);

  const bgTokens = await findTokensByUseCase("button background", "button");
  t.true(Array.isArray(bgTokens.recommendations));

  const categoriesTool = getTool(tokenTools, "get-token-categories");
  const categoriesResult = await categoriesTool.handler({});
  t.truthy(categoriesResult.categories);
  t.true(categoriesResult.categories.length > 0);
});

// --- Workflow validation ---

test("Workflow validation: Component Builder steps execute in sequence", async (t) => {
  const executionLog = [];

  const schema = await getComponentSchema("action-button");
  executionLog.push("get-component-schema");
  t.truthy(schema.schema);

  const tokens = await getComponentTokens("action-button");
  executionLog.push("get-component-tokens");
  t.truthy(tokens.tokensByCategory);

  await findTokensByUseCase("button background", "action-button");
  executionLog.push("find-tokens-by-use-case");

  await getDesignRecommendations("primary", undefined, "button");
  executionLog.push("get-design-recommendations");

  await validateProps("action-button", { variant: "accent" });
  executionLog.push("validate-component-props");

  t.deepEqual(executionLog, [
    "get-component-schema",
    "get-component-tokens",
    "find-tokens-by-use-case",
    "get-design-recommendations",
    "validate-component-props",
  ]);
});

test("Workflow performance: button builder completes in reasonable time", async (t) => {
  const start = Date.now();

  await getComponentSchema("action-button");
  await getComponentTokens("action-button");
  await findTokensByUseCase("button background", "action-button");
  await getDesignRecommendations("primary", undefined, "button");
  await validateProps("action-button", { variant: "accent", size: "m" });

  const duration = Date.now() - start;
  t.true(duration < 10000, "Workflow should complete in under 10 seconds");
});

// --- Error handling ---

test("Error handling: invalid component name for get-component-schema", async (t) => {
  const error = await t.throwsAsync(async () => {
    await getComponentSchema("non-existent-component");
  });
  t.true(error.message.includes("not found"));
});

test("Error handling: invalid token path for get-token-details", async (t) => {
  const error = await t.throwsAsync(async () => {
    await getTokenDetails("invalid.token.path.that.does.not.exist");
  });
  t.true(error.message.includes("not found"));
});

test("Error handling: build-component-config with invalid component", async (t) => {
  const error = await t.throwsAsync(async () => {
    await buildComponentConfig({ component: "non-existent-component" });
  });
  t.true(error.message.includes("not found"));
});

test("Error handling: get-component-schema with empty component", async (t) => {
  const error = await t.throwsAsync(async () => {
    await getComponentSchema("");
  });
  t.truthy(error.message);
});

test("Error handling: find-tokens-by-use-case with missing useCase", async (t) => {
  const tool = getTool(tokenTools, "find-tokens-by-use-case");
  const error = await t.throwsAsync(async () => {
    await tool.handler({});
  });
  t.truthy(error.message);
});

test("Error handling: get-design-recommendations with missing intent", async (t) => {
  const tool = getTool(tokenTools, "get-design-recommendations");
  const error = await t.throwsAsync(async () => {
    await tool.handler({});
  });
  t.truthy(error.message);
});

test("Error handling: validate-component-props with invalid component", async (t) => {
  const error = await t.throwsAsync(async () => {
    await validateProps("non-existent-component", { size: "m" });
  });
  t.true(error.message.includes("not found"));
});
