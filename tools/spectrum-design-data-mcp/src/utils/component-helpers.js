/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/**
 * Build recommended props from schema (defaults + variant when applicable)
 * @param {Object} schema - Component schema
 * @param {string} [variant] - Optional variant to apply to variant property
 * @returns {{ recommendedProps: Record<string, unknown>, schemaProperties: Record<string, { type?: string, description?: string, required: boolean }> }}
 */
export function buildRecommendedProps(schema, variant) {
  const recommendedProps = /** @type {Record<string, unknown>} */ ({});
  const schemaProperties =
    /** @type {Record<string, { type?: string, description?: string, required: boolean }>} */ ({});

  if (!schema?.properties || typeof schema.properties !== "object") {
    return { recommendedProps, schemaProperties };
  }

  const requiredSet = new Set(schema.required || []);

  for (const [propName, propDef] of Object.entries(schema.properties)) {
    if (!propDef || typeof propDef !== "object") continue;

    schemaProperties[propName] = {
      type: propDef.type,
      description: propDef.description,
      required: requiredSet.has(propName),
    };

    if (propDef.default !== undefined) {
      recommendedProps[propName] = propDef.default;
    }

    if (propName === "variant" && variant) {
      const enumValues = propDef.enum;
      if (Array.isArray(enumValues) && enumValues.includes(variant)) {
        recommendedProps[propName] = variant;
      }
    }
  }

  return { recommendedProps, schemaProperties };
}

/**
 * Validate that required props are present
 * @param {Record<string, unknown>} props - Current props
 * @param {Object} schema - Component schema
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateComponentConfig(props, schema) {
  const errors = [];
  const required = schema?.required || [];
  const schemaProps = schema?.properties || {};

  for (const requiredProp of required) {
    if (!(requiredProp in props)) {
      errors.push(`Missing required property: ${requiredProp}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Validate props against schema and collect improvements for suggest-component-improvements
 * @param {Record<string, unknown>} props - User props
 * @param {Object} schema - Component schema
 * @returns {{ valid: boolean, errors: string[], warnings: string[], improvements: Array<{ type: string, property: string, message: string, suggestion: string }> }}
 */
export function validatePropsWithImprovements(props, schema) {
  const errors = [];
  const warnings = [];
  const improvements = [];
  const schemaProps = schema?.properties || {};
  const required = schema?.required || [];

  for (const requiredProp of required) {
    if (!(requiredProp in props)) {
      errors.push(`Missing required property: ${requiredProp}`);
      const propSchema = schemaProps[requiredProp];
      improvements.push({
        type: "missing_required",
        property: requiredProp,
        message: `Add required property: ${requiredProp}`,
        suggestion:
          propSchema?.default != null
            ? String(propSchema.default)
            : "See schema",
      });
    }
  }

  for (const propName of Object.keys(props)) {
    if (!schemaProps[propName]) {
      warnings.push(`Unknown property: ${propName}`);
      improvements.push({
        type: "unknown_property",
        property: propName,
        message: `Property "${propName}" is not defined in the schema`,
        suggestion: "Remove or check spelling",
      });
    }
  }

  for (const [propName, propValue] of Object.entries(props)) {
    const propSchema = schemaProps[propName];
    if (!propSchema) continue;

    if (propSchema.type) {
      const expectedType = propSchema.type;
      const actualType = Array.isArray(propValue) ? "array" : typeof propValue;

      if (expectedType !== actualType) {
        errors.push(
          `Property ${propName} should be ${expectedType}, got ${actualType}`,
        );
        improvements.push({
          type: "type_mismatch",
          property: propName,
          message: `Type mismatch: expected ${expectedType}, got ${actualType}`,
          suggestion: `Change to ${expectedType}`,
        });
      }
    }

    if (
      Array.isArray(propSchema.enum) &&
      !propSchema.enum.includes(propValue)
    ) {
      warnings.push(
        `Property ${propName} value "${propValue}" is not in allowed enum values`,
      );
      improvements.push({
        type: "invalid_enum",
        property: propName,
        message: `Invalid value: "${propValue}"`,
        suggestion: `Use one of: ${propSchema.enum.join(", ")}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    improvements,
  };
}
