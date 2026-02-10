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
        const {
          component,
          variant,
          intent,
          useCase,
          includeTokens = true,
        } = args;

        const schemaData = await getSchemaData();
        const tokenData = await getTokenData();

        // Get component schema
        const fileName = `${component}.json`;
        const schema = schemaData.components[fileName];

        if (!schema) {
          throw new Error(
            `Component not found: ${component}. Use list-components to see available components.`,
          );
        }

        const config = {
          component,
          schema: {
            title: schema.title,
            description: schema.description,
            properties: {},
          },
          recommendedProps: {},
          tokens: includeTokens ? {} : undefined,
          validation: {},
        };

        // Build recommended props based on schema
        if (schema.properties) {
          Object.entries(schema.properties).forEach(([propName, propDef]) => {
            config.schema.properties[propName] = {
              type: propDef.type,
              description: propDef.description,
              required: schema.required?.includes(propName) || false,
            };

            // Set default values if available
            if (propDef.default !== undefined) {
              config.recommendedProps[propName] = propDef.default;
            }

            // Apply variant if it's a variant property
            if (propName === "variant" && variant) {
              if (propDef.enum && propDef.enum.includes(variant)) {
                config.recommendedProps[propName] = variant;
              }
            }
          });
        }

        // Get component tokens if requested
        if (includeTokens) {
          const componentTokens = [];
          const componentLower = component.toLowerCase();

          // Search for component-specific tokens
          Object.entries(tokenData).forEach(([category, tokens]) => {
            if (!tokens) return;

            Object.entries(tokens).forEach(([name, token]) => {
              if (name.toLowerCase().includes(componentLower)) {
                componentTokens.push({
                  name,
                  category,
                  value: token.value,
                  description: token.description,
                });
              }
            });
          });

          // Get design recommendations if intent is provided
          if (intent) {
            const semanticColors = tokenData["semantic-color-palette.json"] || {};
            const recommendations = [];

            Object.entries(semanticColors).forEach(([name, token]) => {
              const nameLower = name.toLowerCase();
              const intentLower = intent.toLowerCase();

              if (
                nameLower.includes(intentLower) ||
                (intentLower === "error" && nameLower.includes("negative")) ||
                (intentLower === "success" && nameLower.includes("positive")) ||
                (intentLower === "warning" && nameLower.includes("notice"))
              ) {
                recommendations.push({
                  name,
                  value: token.value,
                  category: "semantic-color-palette",
                  type: "semantic",
                });
              }
            });

            config.tokens.colors = recommendations.slice(0, 5);
          }

          // Find tokens by use case if provided
          if (useCase) {
            const useCaseLower = useCase.toLowerCase();
            const useCaseTokens = [];

            Object.entries(tokenData).forEach(([category, tokens]) => {
              if (!tokens) return;

              Object.entries(tokens).forEach(([name, token]) => {
                const nameMatch =
                  name.toLowerCase().includes(useCaseLower) ||
                  (token.description &&
                    token.description.toLowerCase().includes(useCaseLower));

                if (nameMatch && !token.private) {
                  useCaseTokens.push({
                    name,
                    category,
                    value: token.value,
                    description: token.description,
                  });
                }
              });
            });

            if (useCaseTokens.length > 0) {
              config.tokens.useCaseTokens = useCaseTokens.slice(0, 10);
            }
          }

          // Group component tokens by category
          if (componentTokens.length > 0) {
            config.tokens.componentTokens = componentTokens.reduce(
              (acc, token) => {
                if (!acc[token.category]) acc[token.category] = [];
                acc[token.category].push(token);
                return acc;
              },
              {},
            );
          }
        }

        // Basic validation of recommended props
        const validationErrors = [];
        const required = schema.required || [];
        for (const requiredProp of required) {
          if (!(requiredProp in config.recommendedProps)) {
            validationErrors.push(`Missing required property: ${requiredProp}`);
          }
        }

        config.validation = {
          valid: validationErrors.length === 0,
          errors: validationErrors,
          warnings: [],
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
        const { component, props, includeTokenSuggestions = true } = args;

        const schemaData = await getSchemaData();
        const tokenData = await getTokenData();

        // Get component schema
        const fileName = `${component}.json`;
        const schema = schemaData.components[fileName];

        if (!schema) {
          throw new Error(
            `Component not found: ${component}. Use list-components to see available components.`,
          );
        }

        const suggestions = {
          component,
          currentProps: props,
          validation: {
            valid: true,
            errors: [],
            warnings: [],
          },
          improvements: [],
          tokenRecommendations: includeTokenSuggestions ? {} : undefined,
          bestPractices: [],
        };

        // Validate props against schema
        const schemaProps = schema.properties || {};
        const required = schema.required || [];

        // Check required properties
        for (const requiredProp of required) {
          if (!(requiredProp in props)) {
            suggestions.validation.valid = false;
            suggestions.validation.errors.push(
              `Missing required property: ${requiredProp}`,
            );
            suggestions.improvements.push({
              type: "missing_required",
              property: requiredProp,
              message: `Add required property: ${requiredProp}`,
              suggestion: schemaProps[requiredProp]?.default || "See schema",
            });
          }
        }

        // Check for unknown properties
        for (const propName of Object.keys(props)) {
          if (!schemaProps[propName]) {
            suggestions.validation.warnings.push(
              `Unknown property: ${propName}`,
            );
            suggestions.improvements.push({
              type: "unknown_property",
              property: propName,
              message: `Property "${propName}" is not defined in the schema`,
              suggestion: "Remove or check spelling",
            });
          }
        }

        // Check property types
        for (const [propName, propValue] of Object.entries(props)) {
          const propSchema = schemaProps[propName];
          if (!propSchema) continue;

          if (propSchema.type) {
            const expectedType = propSchema.type;
            const actualType = Array.isArray(propValue)
              ? "array"
              : typeof propValue;

            if (expectedType !== actualType) {
              suggestions.validation.valid = false;
              suggestions.validation.errors.push(
                `Property ${propName} should be ${expectedType}, got ${actualType}`,
              );
              suggestions.improvements.push({
                type: "type_mismatch",
                property: propName,
                message: `Type mismatch: expected ${expectedType}, got ${actualType}`,
                suggestion: `Change to ${expectedType}`,
              });
            }
          }

          // Check enum values
          if (propSchema.enum && !propSchema.enum.includes(propValue)) {
            suggestions.validation.warnings.push(
              `Property ${propName} value "${propValue}" is not in allowed enum values`,
            );
            suggestions.improvements.push({
              type: "invalid_enum",
              property: propName,
              message: `Invalid value: "${propValue}"`,
              suggestion: `Use one of: ${propSchema.enum.join(", ")}`,
            });
          }
        }

        // Get token recommendations if requested
        if (includeTokenSuggestions) {
          const componentTokens = [];
          const componentLower = component.toLowerCase();

          // Find component-specific tokens
          Object.entries(tokenData).forEach(([category, tokens]) => {
            if (!tokens) return;

            Object.entries(tokens).forEach(([name, token]) => {
              if (
                name.toLowerCase().includes(componentLower) &&
                !token.private &&
                !token.deprecated
              ) {
                componentTokens.push({
                  name,
                  category,
                  value: token.value,
                  description: token.description,
                });
              }
            });
          });

          // Group by category
          if (componentTokens.length > 0) {
            suggestions.tokenRecommendations.componentTokens =
              componentTokens.reduce((acc, token) => {
                if (!acc[token.category]) acc[token.category] = [];
                acc[token.category].push(token);
                return acc;
              }, {});
          }

          // Suggest semantic tokens based on variant/intent
          if (props.variant) {
            const variantLower = props.variant.toLowerCase();
            const semanticColors = tokenData["semantic-color-palette.json"] ||
              {};
            const semanticTokens = [];

            Object.entries(semanticColors).forEach(([name, token]) => {
              const nameLower = name.toLowerCase();
              if (
                nameLower.includes(variantLower) ||
                (variantLower === "accent" && nameLower.includes("accent")) ||
                (variantLower === "negative" && nameLower.includes("negative"))
              ) {
                semanticTokens.push({
                  name,
                  value: token.value,
                  category: "semantic-color-palette",
                  type: "semantic",
                });
              }
            });

            if (semanticTokens.length > 0) {
              suggestions.tokenRecommendations.semanticColors =
                semanticTokens.slice(0, 5);
            }
          }
        }

        // Add best practices
        suggestions.bestPractices.push(
          "Use semantic tokens (semantic-color-palette) over raw palette tokens",
          "Check for deprecated tokens and use renamed alternatives",
          "Validate all props against the component schema",
          "Use get-component-options for a user-friendly view of available props",
        );

        return suggestions;
      },
    },
  ];
}
