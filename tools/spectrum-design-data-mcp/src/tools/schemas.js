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
        const { component, query, limit = 20 } = args;
        const schemaData = await getSchemaData();

        let results = [];

        // Search through component schemas
        for (const [fileName, schema] of Object.entries(
          schemaData.components,
        )) {
          const componentName = fileName.replace(".json", "");

          // Apply component filter
          if (component && !componentName.includes(component.toLowerCase())) {
            continue;
          }

          // Apply query filter
          if (query && !matchesSchemaQuery(componentName, schema, query)) {
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

        // Apply limit
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
      description: "Get the complete schema for a specific component",
      inputSchema: {
        type: "object",
        properties: {
          component: {
            type: "string",
            description: 'Component name (e.g., "action-button")',
            required: true,
          },
        },
        required: ["component"],
      },
      handler: async (args) => {
        const { component } = args;
        const schemaData = await getSchemaData();

        const fileName = `${component}.json`;
        const schema = schemaData.components[fileName];

        if (!schema) {
          throw new Error(`Component schema not found: ${component}`);
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
      description: "List all available Spectrum components with schemas",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async () => {
        const schemaData = await getSchemaData();

        const components = Object.keys(schemaData.components).map(
          (fileName) => {
            const componentName = fileName.replace(".json", "");
            const schema = schemaData.components[fileName];

            return {
              name: componentName,
              title: schema.title,
              description: schema.description,
              propertyCount: Object.keys(schema.properties || {}).length,
              hasRequired: (schema.required || []).length > 0,
            };
          },
        );

        return {
          total: components.length,
          components: components.sort((a, b) => a.name.localeCompare(b.name)),
        };
      },
    },
    {
      name: "validate-component-props",
      description: "Validate component properties against their schema",
      inputSchema: {
        type: "object",
        properties: {
          component: {
            type: "string",
            description: "Component name to validate against",
            required: true,
          },
          props: {
            type: "object",
            description: "Component properties to validate",
            required: true,
          },
        },
        required: ["component", "props"],
      },
      handler: async (args) => {
        const { component, props } = args;
        const schemaData = await getSchemaData();

        const fileName = `${component}.json`;
        const schema = schemaData.components[fileName];

        if (!schema) {
          throw new Error(`Component schema not found: ${component}`);
        }

        // Basic validation logic
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
        const { type } = args;
        const schemaData = await getSchemaData();

        if (type) {
          const typeSchema = schemaData.types[`${type}.json`];
          if (!typeSchema) {
            throw new Error(`Type schema not found: ${type}`);
          }

          return {
            type,
            schema: typeSchema,
          };
        }

        // Return all types
        const types = Object.keys(schemaData.types).map((fileName) => {
          const typeName = fileName.replace(".json", "");
          const typeSchema = schemaData.types[fileName];

          return {
            name: typeName,
            title: typeSchema.title,
            description: typeSchema.description,
            type: typeSchema.type,
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
        const { component, detailed = false } = args;
        const schemaData = await getSchemaData();

        const fileName = `${component}.json`;
        const schema = schemaData.components[fileName];

        if (!schema) {
          throw new Error(
            `Component not found: ${component}. Use list-components to see available components.`,
          );
        }

        const componentInfo = {
          name: component,
          title: schema.title || component,
          description: schema.description,
          totalProperties: 0,
          properties: [],
        };

        if (schema.properties) {
          componentInfo.totalProperties = Object.keys(schema.properties).length;

          Object.entries(schema.properties).forEach(([propName, propDef]) => {
            const propInfo = {
              name: propName,
              type: propDef.type || "object",
              required: schema.required
                ? schema.required.includes(propName)
                : false,
              description: propDef.description,
            };

            if (detailed) {
              // Add detailed information
              if (propDef.enum) {
                propInfo.possibleValues = propDef.enum;
              }
              if (propDef.default !== undefined) {
                propInfo.defaultValue = propDef.default;
              }
              if (propDef.properties) {
                propInfo.nestedProperties = Object.keys(propDef.properties);
              }
              if (propDef.$ref) {
                propInfo.reference = propDef.$ref;
              }
            }

            componentInfo.properties.push(propInfo);
          });

          // Sort properties: required first, then alphabetical
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
        'Find components that have specific features or properties (e.g., "size", "disabled", "selected")',
      inputSchema: {
        type: "object",
        properties: {
          feature: {
            type: "string",
            description:
              'The feature/property to search for (e.g., "size", "disabled", "icon", "label")',
            required: true,
          },
        },
        required: ["feature"],
      },
      handler: async (args) => {
        const { feature } = args;
        const schemaData = await getSchemaData();
        const matchingComponents = [];

        Object.entries(schemaData.components).forEach(([fileName, schema]) => {
          const componentName = fileName.replace(".json", "");

          if (schema.properties) {
            const hasFeature = Object.keys(schema.properties).some((prop) =>
              prop.toLowerCase().includes(feature.toLowerCase()),
            );

            if (hasFeature) {
              const matchingProps = Object.keys(schema.properties).filter(
                (prop) => prop.toLowerCase().includes(feature.toLowerCase()),
              );

              matchingComponents.push({
                name: componentName,
                title: schema.title || componentName,
                description: schema.description,
                matchingProperties: matchingProps,
                totalProperties: Object.keys(schema.properties).length,
              });
            }
          }
        });

        return {
          feature,
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
  const searchText = query.toLowerCase();

  // Search in component name
  if (componentName.toLowerCase().includes(searchText)) {
    return true;
  }

  // Search in title
  if (schema.title && schema.title.toLowerCase().includes(searchText)) {
    return true;
  }

  // Search in description
  if (
    schema.description &&
    schema.description.toLowerCase().includes(searchText)
  ) {
    return true;
  }

  // Search in property names
  if (schema.properties) {
    for (const propName of Object.keys(schema.properties)) {
      if (propName.toLowerCase().includes(searchText)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Basic validation of properties against schema
 * @param {Object} props - Properties to validate
 * @param {Object} schema - Schema to validate against
 * @returns {Object} Validation results
 */
function validateProps(props, schema) {
  const errors = [];
  const warnings = [];

  // Check required properties
  const required = schema.required || [];
  for (const requiredProp of required) {
    if (!(requiredProp in props)) {
      errors.push(`Missing required property: ${requiredProp}`);
    }
  }

  // Check property types (basic validation)
  const schemaProps = schema.properties || {};
  for (const [propName, propValue] of Object.entries(props)) {
    const propSchema = schemaProps[propName];

    if (!propSchema) {
      warnings.push(`Unknown property: ${propName}`);
      continue;
    }

    // Basic type checking
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
