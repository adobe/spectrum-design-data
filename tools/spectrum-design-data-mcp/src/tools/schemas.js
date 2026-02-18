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
      description: "List all components (names and summary, no full schema).",
      inputSchema: { type: "object", properties: {} },
      handler: async () => {
        const schemaData = await getSchemaData();
        const components = Object.keys(schemaData.components).map(
          (fileName) => {
            const componentName = fileName.replace(".json", "");
            const schema = schemaData.components[fileName];
            const entry = {
              name: componentName,
              propertyCount: Object.keys(schema.properties || {}).length,
            };
            if (schema.title) entry.title = schema.title;
            if (schema.description) entry.description = schema.description;
            return entry;
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
              const entry = {
                name: componentName,
                matchingProperties: matchingProps,
                totalProperties: Object.keys(schema.properties).length,
              };
              if (schema.title) entry.title = schema.title;
              if (schema.description) entry.description = schema.description;
              matchingComponents.push(entry);
            }
          }
        });

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
