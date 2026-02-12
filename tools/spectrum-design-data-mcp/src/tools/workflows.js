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

import { getTokenData } from "../data/tokens.js";
import { getSchemaData } from "../data/schemas.js";
import { RESULT_LIMITS } from "../constants.js";
import {
  validateComponentName,
  validatePropsObject,
  validateStringParam,
} from "../utils/validation.js";
import {
  buildRecommendedProps,
  validateComponentConfig,
  validatePropsWithImprovements,
} from "../utils/component-helpers.js";
import {
  findComponentTokens,
  findSemanticColorsByIntent,
  findSemanticColorsByVariant,
  findTokensByUseCase,
  groupTokensByCategory,
} from "../utils/token-helpers.js";

/**
 * Create workflow-oriented MCP tools that orchestrate multiple operations
 * @returns {Array} Array of workflow tools
 */
export function createWorkflowTools() {
  return [
    {
      name: "build-component-config",
      description:
        "Generate a complete component configuration with recommended tokens and props. This tool orchestrates multiple MCP tools to provide a ready-to-use component configuration.",
      inputSchema: {
        type: "object",
        properties: {
          component: {
            type: "string",
            description:
              'Component name (e.g., "action-button", "text-field", "card")',
            required: true,
          },
          variant: {
            type: "string",
            description:
              'Component variant (e.g., "accent", "primary", "secondary")',
          },
          intent: {
            type: "string",
            description:
              'Design intent (e.g., "primary", "secondary", "accent", "negative", "positive")',
          },
          useCase: {
            type: "string",
            description:
              'Use case description (e.g., "primary action button", "error input field")',
          },
          includeTokens: {
            type: "boolean",
            description:
              "Include recommended design tokens in the configuration (default: true)",
            default: true,
          },
        },
        required: ["component"],
      },
      handler: async (args) => {
        const rawComponent = args?.component;
        const variant = validateStringParam(args?.variant, "variant");
        const intent = validateStringParam(args?.intent, "intent");
        const useCase = validateStringParam(args?.useCase, "useCase");
        const includeTokens = args?.includeTokens !== false;

        const component = validateComponentName(rawComponent);

        const schemaData = await getSchemaData();
        const tokenData = await getTokenData();

        const fileName = `${component}.json`;
        const schema =
          schemaData?.components != null
            ? schemaData.components[fileName]
            : undefined;

        if (!schema || typeof schema !== "object") {
          throw new Error(
            `Component not found: ${component}. Use list-components to see available components.`,
          );
        }

        const { recommendedProps, schemaProperties } = buildRecommendedProps(
          schema,
          variant,
        );

        const config = {
          component,
          schema: {
            title: schema.title,
            description: schema.description,
            properties: schemaProperties,
          },
          recommendedProps,
          tokens: includeTokens ? {} : undefined,
          validation: {},
        };

        if (includeTokens && tokenData && typeof tokenData === "object") {
          const componentTokens = findComponentTokens(tokenData, component);
          if (componentTokens.length > 0) {
            config.tokens.componentTokens =
              groupTokensByCategory(componentTokens);
          }

          if (intent) {
            const semanticColors =
              tokenData["semantic-color-palette.json"] ?? {};
            const recommendations = findSemanticColorsByIntent(
              semanticColors,
              intent,
              RESULT_LIMITS.MAX_COLOR_RECOMMENDATIONS,
            );
            if (recommendations.length > 0) {
              config.tokens.colors = recommendations;
            }
          }

          if (useCase) {
            const useCaseTokens = findTokensByUseCase(
              tokenData,
              useCase,
              RESULT_LIMITS.MAX_USE_CASE_TOKENS,
            );
            if (useCaseTokens.length > 0) {
              config.tokens.useCaseTokens = useCaseTokens;
            }
          }
        }

        const validationResult = validateComponentConfig(
          config.recommendedProps,
          schema,
        );
        config.validation = {
          valid: validationResult.valid,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        };

        return config;
      },
    },
    {
      name: "suggest-component-improvements",
      description:
        "Analyze an existing component configuration and suggest improvements including token recommendations, validation fixes, and best practices.",
      inputSchema: {
        type: "object",
        properties: {
          component: {
            type: "string",
            description: "Component name to analyze",
            required: true,
          },
          props: {
            type: "object",
            description: "Current component properties to analyze",
            required: true,
          },
          includeTokenSuggestions: {
            type: "boolean",
            description:
              "Include token recommendations for styling (default: true)",
            default: true,
          },
        },
        required: ["component", "props"],
      },
      handler: async (args) => {
        const rawComponent = args?.component;
        const props = validatePropsObject(args?.props);
        const includeTokenSuggestions = args?.includeTokenSuggestions !== false;

        const component = validateComponentName(rawComponent);

        const schemaData = await getSchemaData();
        const tokenData = await getTokenData();

        const fileName = `${component}.json`;
        const schema =
          schemaData?.components != null
            ? schemaData.components[fileName]
            : undefined;

        if (!schema || typeof schema !== "object") {
          throw new Error(
            `Component not found: ${component}. ` +
              "Use list-components to see available components. " +
              "Or use build-component-config to generate a complete configuration from scratch.",
          );
        }

        const validationResult = validatePropsWithImprovements(props, schema);

        const suggestions = {
          component,
          currentProps: props,
          validation: {
            valid: validationResult.valid,
            errors: validationResult.errors,
            warnings: validationResult.warnings,
          },
          improvements: validationResult.improvements,
          tokenRecommendations: includeTokenSuggestions ? {} : undefined,
          bestPractices: [
            "Use semantic tokens (semantic-color-palette) over raw palette tokens",
            "Check for deprecated tokens and use renamed alternatives",
            "Validate all props against the component schema",
            "Use get-component-options for a user-friendly view of available props",
          ],
        };

        if (
          includeTokenSuggestions &&
          tokenData &&
          typeof tokenData === "object"
        ) {
          const componentTokens = findComponentTokens(tokenData, component, {
            excludePrivate: true,
            excludeDeprecated: true,
          });
          if (componentTokens.length > 0) {
            suggestions.tokenRecommendations.componentTokens =
              groupTokensByCategory(componentTokens);
          }

          const variant = props.variant;
          if (variant != null && typeof variant === "string") {
            const semanticColors =
              tokenData["semantic-color-palette.json"] ?? {};
            const semanticTokens = findSemanticColorsByVariant(
              semanticColors,
              String(variant),
              RESULT_LIMITS.MAX_SEMANTIC_COLORS,
            );
            if (semanticTokens.length > 0) {
              suggestions.tokenRecommendations.semanticColors = semanticTokens;
            }
          }
        }

        return suggestions;
      },
    },
  ];
}
