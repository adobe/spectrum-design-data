/*************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 **************************************************************************/

interface SchemaProperty {
  type?: string;
  enum?: string[];
  default?: string | boolean | number;
  $ref?: string;
  description?: string;
}

interface OfficialSchema {
  title: string;
  description?: string;
  meta?: {
    category: string;
    documentationUrl: string;
  };
  properties?: Record<string, SchemaProperty>;
  required?: string[];
}

/**
 * Detect if an enum represents size values
 */
function isSizeEnum(enumValues: string[]): boolean {
  const sizeValues = ["xs", "s", "m", "l", "xl", "xxl", "xxxl"];
  return (
    enumValues.length > 0 && enumValues.every((v) => sizeValues.includes(v))
  );
}

/**
 * Detect if an enum represents state values
 */
function isStateEnum(enumValues: string[]): boolean {
  const stateKeywords = [
    "hover",
    "active",
    "focus",
    "disabled",
    "default",
    "down",
    "keyboard",
  ];
  return enumValues.some((v) =>
    stateKeywords.some((keyword) => v.toLowerCase().includes(keyword)),
  );
}

/**
 * Detect the plugin option type from a JSON Schema property
 */
function detectOptionType(property: SchemaProperty): OptionTypes {
  // Check for $ref first
  if (property.$ref) {
    if (property.$ref.includes("workflow-icon")) {
      return "icon";
    }
    if (property.$ref.includes("hex-color")) {
      return "color";
    }
  }

  // Check type
  if (property.type === "boolean") {
    return "boolean";
  }

  if (property.type === "string" && property.enum) {
    // Detect special enum types
    if (isSizeEnum(property.enum)) {
      return "size";
    }
    if (isStateEnum(property.enum)) {
      return "state";
    }
    return "localEnum";
  }

  if (property.type === "string") {
    return "string";
  }

  if (property.type === "number") {
    return "dimension";
  }

  // Default to string
  return "string";
}

/**
 * Convert a single JSON Schema property to plugin option format
 */
function convertPropertyToOption(
  propertyName: string,
  property: SchemaProperty,
  isRequired: boolean,
): ComponentOptionInterface {
  const optionType = detectOptionType(property);
  const option: ComponentOptionInterface = {
    title: propertyName,
    type: optionType,
    required: isRequired,
  };

  // Add description if present
  if (property.description) {
    option.description = property.description;
  }

  // Add default value
  if (property.default !== undefined) {
    option.defaultValue = property.default;
  }

  // Add items for enum types
  if (
    property.enum &&
    (optionType === "localEnum" ||
      optionType === "size" ||
      optionType === "state")
  ) {
    option.items = property.enum;
  }

  return option;
}

/**
 * Convert JSON Schema properties object to plugin options array
 */
function convertPropertiesToOptions(
  properties: Record<string, SchemaProperty> | undefined,
  requiredFields: string[] = [],
): Array<ComponentOptionInterface> {
  if (!properties) {
    return [];
  }

  const options: Array<ComponentOptionInterface> = [];

  for (const [propertyName, property] of Object.entries(properties)) {
    const isRequired = requiredFields.includes(propertyName);
    const option = convertPropertyToOption(propertyName, property, isRequired);
    options.push(option);
  }

  return options;
}

/**
 * Convert official Spectrum Design Data schema to plugin format
 */
export function convertSchemaToPluginFormat(
  schema: OfficialSchema,
): ComponentInterface {
  // Extract metadata with defaults
  const meta: MetaInterface = {
    category:
      schema.meta && schema.meta.category ? schema.meta.category : "actions",
    documentationUrl:
      schema.meta && schema.meta.documentationUrl
        ? schema.meta.documentationUrl
        : "",
  };

  // Convert properties → options array
  const options = convertPropertiesToOptions(
    schema.properties,
    schema.required || [],
  );

  return {
    title: schema.title,
    meta,
    options,
  };
}
