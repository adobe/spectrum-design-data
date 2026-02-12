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

import { getSchemaData } from "../data/schemas.js";
import { RESULT_LIMITS } from "../constants.js";
import {
  validateComponentName,
  validateLimit,
  validatePropsObject,
  validateStringParam,
} from "../utils/validation.js";

/**
 * Create schema-related MCP tools
 * @returns {Array} Array of schema tools
 */
export function createSchemaTools() {
  return [
    {
      name: "query-component-schemas",
      description: "Search and retrieve Spectrum component API schemas",
      inputSchema: {
        type: "object",
        properties: {
          component: {
            type: "string",
            description:
              'Component name to search for (e.g., "button", "action-button")',
          },
          query: {
            type: "string",
            description:
              "Search query to filter schemas (searches component names, descriptions)",
          },
          limit: {
            type: "number",
            description: "Maximum number of schemas to return (default: 20)",
            default: 20,
          },
        },
      },
      handler: async (args) => {
        const component = validateStringParam(args?.component, "component");
        const query = validateStringParam(args?.query, "query");
        const limit = validateLimit(
          args?.limit,
          RESULT_LIMITS.DEFAULT_SCHEMA_LIMIT,
          100,
        );

        const schemaData = await getSchemaData();
        let results = [];

        const components =
          schemaData?.components != null &&
          typeof schemaData.components === "object"
            ? schemaData.components
            : {};

        for (const [fileName, schema] of Object.entries(components)) {
          if (!schema || typeof schema !== "object") continue;

          const componentName = String(fileName).replace(".json", "");

          if (
            component != null &&
            component !== "" &&
            !componentName.toLowerCase().includes(component.toLowerCase())
          ) {
            continue;
          }

          if (
            query != null &&
            query !== "" &&
            !matchesSchemaQuery(componentName, schema, query)
          ) {
            continue;
          }

          results.push({
            component: componentName,
            fileName,
            title: schema.title,
            description: schema.description,
            properties: Object.keys(schema.properties || {}),
            required: schema.required || [],
            schema,
          });
        }

        results = results.slice(0, limit);

        return {
          total: results.length,
          schemas: results,
          query: { component, query, limit },
        };
      },
    },
    {
      name: "get-component-schema",
      description: "Get full JSON schema for one component.",
      inputSchema: {
        type: "object",
        properties: {
          component: {
            type: "string",
            description: "Component name",
            required: true,
          },
        },
        required: ["component"],
      },
      handler: async (args) => {
        const component = validateComponentName(args?.component);

        const schemaData = await getSchemaData();
        const fileName = `${component}.json`;
        const schema =
          schemaData?.components != null
            ? schemaData.components[fileName]
            : undefined;

        if (!schema || typeof schema !== "object") {
          throw new Error(
            `Component schema not found: ${component}. ` +
              "Use list-components to see all available components, or " +
              "check https://spectrum.adobe.com/page/components for documentation.",
          );
        }

        return {
          component,
          schema,
          metadata: {
            title: schema.title,
            description: schema.description,
            propertyCount: Object.keys(schema.properties || {}).length,
            requiredCount: (schema.required || []).length,
          },
        };
      },
    },
    {
      name: "list-components",
      description: "List all components (names and summary, no full schema).",
      inputSchema: { type: "object", properties: {} },
      handler: async () => {
        const schemaData = await getSchemaData();
        const components =
          schemaData?.components != null &&
          typeof schemaData.components === "object"
            ? schemaData.components
            : {};

        const list = Object.keys(components).map((fileName) => {
          const componentName = String(fileName).replace(".json", "");
          const schema = components[fileName];
          const props = schema?.properties;
          const required = schema?.required;

          return {
            name: componentName,
            title: schema?.title,
            description: schema?.description,
            propertyCount:
              props && typeof props === "object"
                ? Object.keys(props).length
                : 0,
            hasRequired: Array.isArray(required) && required.length > 0,
          };
        });

        return {
          total: list.length,
          components: list.sort((a, b) => a.name.localeCompare(b.name)),
        };
      },
    },
    {
      name: "validate-component-props",
      description: "Validate props against a component schema.",
      inputSchema: {
        type: "object",
        properties: {
          component: {
            type: "string",
            description: "Component name",
            required: true,
          },
          props: {
            type: "object",
            description: "Props to validate",
            required: true,
          },
        },
        required: ["component", "props"],
      },
      handler: async (args) => {
        const component = validateComponentName(args?.component);
        const props = validatePropsObject(args?.props);

        const schemaData = await getSchemaData();
        const fileName = `${component}.json`;
        const schema =
          schemaData?.components != null
            ? schemaData.components[fileName]
            : undefined;

        if (!schema || typeof schema !== "object") {
          throw new Error(
            `Component schema not found: ${component}. ` +
              "This might mean: " +
              "1. The component name is misspelled (use list-components to verify), " +
              "2. The component doesn't have a schema yet, " +
              "3. The component is from a different package. " +
              "Try: get-component-options to explore available options.",
          );
        }

        const validationResults = validateProps(props, schema);

        return {
          component,
          valid: validationResults.valid,
          errors: validationResults.errors,
          warnings: validationResults.warnings,
          props,
        };
      },
    },
    {
      name: "get-type-schemas",
      description: "Get type definitions used in component schemas",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description: 'Specific type to retrieve (e.g., "hex-color")',
          },
        },
      },
      handler: async (args) => {
        const type = validateStringParam(args?.type, "type");
        const schemaData = await getSchemaData();

        if (type != null && type !== "") {
          const typeSchema =
            schemaData?.types != null
              ? schemaData.types[`${type}.json`]
              : undefined;
          if (!typeSchema || typeof typeSchema !== "object") {
            throw new Error(
              `Type schema not found: ${type}. ` +
                "Use get-type-schemas to list all available type definitions.",
            );
          }

          return {
            type,
            schema: typeSchema,
          };
        }

        const typesData =
          schemaData?.types != null && typeof schemaData.types === "object"
            ? schemaData.types
            : {};
        const types = Object.keys(typesData).map((fileName) => {
          const typeName = String(fileName).replace(".json", "");
          const typeSchema = typesData[fileName];
          return {
            name: typeName,
            title: typeSchema?.title,
            description: typeSchema?.description,
            type: typeSchema?.type,
          };
        });

        return {
          total: types.length,
          types: types.sort((a, b) => a.name.localeCompare(b.name)),
        };
      },
    },
    {
      name: "get-component-options",
      description:
        "Get all available options/properties for a component in a user-friendly format - perfect for discovering what options a component supports",
      inputSchema: {
        type: "object",
        properties: {
          component: {
            type: "string",
            description:
              'Component name (e.g., "action-button", "text-field", "menu")',
            required: true,
          },
          detailed: {
            type: "boolean",
            description:
              "Include detailed property information like enums, default values, etc.",
            default: false,
          },
        },
        required: ["component"],
      },
      handler: async (args) => {
        const component = validateComponentName(args?.component);
        const detailed = args?.detailed === true;

        const schemaData = await getSchemaData();
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

        const componentInfo = {
          name: component,
          title: schema.title ?? component,
          description: schema.description,
          totalProperties: 0,
          properties: [],
        };

        const props = schema.properties;
        if (props && typeof props === "object") {
          componentInfo.totalProperties = Object.keys(props).length;
          const required = schema.required || [];

          for (const [propName, propDef] of Object.entries(props)) {
            if (!propDef || typeof propDef !== "object") continue;

            const propInfo = {
              name: propName,
              type: propDef.type ?? "object",
              required: required.includes(propName),
              description: propDef.description,
            };

            if (detailed) {
              if (Array.isArray(propDef.enum)) {
                propInfo.possibleValues = propDef.enum;
              }
              if (propDef.default !== undefined) {
                propInfo.defaultValue = propDef.default;
              }
              if (
                propDef.properties &&
                typeof propDef.properties === "object"
              ) {
                propInfo.nestedProperties = Object.keys(propDef.properties);
              }
              if (propDef.$ref != null) {
                propInfo.reference = propDef.$ref;
              }
            }

            componentInfo.properties.push(propInfo);
          }

          componentInfo.properties.sort((a, b) => {
            if (a.required !== b.required) return a.required ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
        }

        return componentInfo;
      },
    },
    {
      name: "search-components-by-feature",
      description:
        "Find components that have a property matching a name (e.g. size, disabled).",
      inputSchema: {
        type: "object",
        properties: {
          feature: {
            type: "string",
            description: "Property name substring",
            required: true,
          },
        },
        required: ["feature"],
      },
      handler: async (args) => {
        const feature =
          args?.feature != null ? String(args.feature) : undefined;
        if (!feature || feature.trim() === "") {
          throw new Error(
            "feature is required for component search. " +
              "Provide a feature to search for (e.g., 'validation', 'icon', 'selection'). " +
              "Common features: validation, disabled, icon, selection, loading, error.",
          );
        }

        const schemaData = await getSchemaData();
        const matchingComponents = [];
        const components =
          schemaData?.components != null &&
          typeof schemaData.components === "object"
            ? schemaData.components
            : {};
        const featureLower = feature.toLowerCase();

        for (const [fileName, schema] of Object.entries(components)) {
          if (!schema || typeof schema !== "object") continue;

          const componentName = String(fileName).replace(".json", "");
          const props = schema.properties;

          if (!props || typeof props !== "object") continue;

          const hasFeature = Object.keys(props).some((prop) =>
            prop.toLowerCase().includes(featureLower),
          );

          if (hasFeature) {
            const matchingProps = Object.keys(props).filter((prop) =>
              prop.toLowerCase().includes(featureLower),
            );

            matchingComponents.push({
              name: componentName,
              title: schema.title ?? componentName,
              description: schema.description,
              matchingProperties: matchingProps,
              totalProperties: Object.keys(props).length,
            });
          }
        }

        return {
          totalMatches: matchingComponents.length,
          components: matchingComponents.sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        };
      },
    },
  ];
}

/**
 * Check if a schema matches the search query
 * @param {string} componentName - Component name
 * @param {Object} schema - Schema object
 * @param {string} query - Search query
 * @returns {boolean} Whether the schema matches
 */
function matchesSchemaQuery(componentName, schema, query) {
  const searchText = String(query).toLowerCase();

  if (componentName.toLowerCase().includes(searchText)) {
    return true;
  }

  if (
    schema?.title != null &&
    String(schema.title).toLowerCase().includes(searchText)
  ) {
    return true;
  }

  if (
    schema?.description != null &&
    String(schema.description).toLowerCase().includes(searchText)
  ) {
    return true;
  }

  const props = schema?.properties;
  if (props && typeof props === "object") {
    for (const propName of Object.keys(props)) {
      if (propName.toLowerCase().includes(searchText)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Basic validation of properties against schema
 * @param {Record<string, unknown>} props - Properties to validate
 * @param {Object} schema - Schema to validate against
 * @returns {Object} Validation results
 */
function validateProps(props, schema) {
  const errors = [];
  const warnings = [];
  const required = schema?.required || [];
  const schemaProps = schema?.properties || {};

  for (const requiredProp of required) {
    if (!(requiredProp in props)) {
      errors.push(`Missing required property: ${requiredProp}`);
    }
  }

  for (const [propName, propValue] of Object.entries(props)) {
    const propSchema = schemaProps[propName];

    if (!propSchema || typeof propSchema !== "object") {
      warnings.push(`Unknown property: ${propName}`);
      continue;
    }

    if (propSchema.type) {
      const expectedType = propSchema.type;
      const actualType = Array.isArray(propValue) ? "array" : typeof propValue;

      if (expectedType !== actualType) {
        errors.push(
          `Property ${propName} should be ${expectedType}, got ${actualType}`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
