# [**@adobe/component-schema-converter**](https://github.com/adobe/component-schema-converter)

Convert between Component Options Editor format and official Spectrum JSON Schema format with comprehensive validation and error handling.

## Overview

This library provides pure functions to convert component schemas between two formats:

* **Plugin Format**: Simplified format used by the Component Options Editor Figma plugin
* **Official Schema**: JSON Schema 2020-12 format used in [`packages/component-schemas`](../component-schemas/)

## Installation

This package is part of the Spectrum Design Data monorepo and uses pnpm workspaces:

```bash
pnpm install
```

## Quick Start

### Converting Plugin Format to Official Schema

```javascript
import { convertPluginToSchema } from "@adobe/component-schema-converter";

const pluginData = {
  title: "Button",
  meta: {
    category: "actions",
    documentationUrl: "https://spectrum.adobe.com/page/button/",
  },
  options: [
    {
      title: "size",
      type: "size",
      items: ["s", "m", "l", "xl"],
      defaultValue: "m",
      required: false,
    },
    {
      title: "variant",
      type: "localEnum",
      items: ["accent", "negative", "primary", "secondary"],
      defaultValue: "accent",
      required: false,
    },
    {
      title: "isDisabled",
      type: "boolean",
      defaultValue: false,
      required: false,
    },
  ],
};

const officialSchema = convertPluginToSchema(pluginData, {
  description: "Buttons allow users to perform an action or to navigate to another page.",
});

console.log(JSON.stringify(officialSchema, null, 2));
```

Output:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://opensource.adobe.com/spectrum-design-data/schemas/components/button.json",
  "title": "Button",
  "description": "Buttons allow users to perform an action or to navigate to another page.",
  "meta": {
    "category": "actions",
    "documentationUrl": "https://spectrum.adobe.com/page/button/"
  },
  "type": "object",
  "properties": {
    "size": {
      "type": "string",
      "enum": ["s", "m", "l", "xl"],
      "default": "m"
    },
    "variant": {
      "type": "string",
      "enum": ["accent", "negative", "primary", "secondary"],
      "default": "accent"
    },
    "isDisabled": {
      "type": "boolean",
      "default": false
    }
  }
}
```

### Converting Official Schema to Plugin Format

```javascript
import { convertSchemaToPlugin } from "@adobe/component-schema-converter";

const officialSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://opensource.adobe.com/spectrum-design-data/schemas/components/button.json",
  title: "Button",
  description: "Buttons allow users to perform an action.",
  meta: {
    category: "actions",
    documentationUrl: "https://spectrum.adobe.com/page/button/",
  },
  type: "object",
  properties: {
    size: {
      type: "string",
      enum: ["s", "m", "l", "xl"],
      default: "m",
    },
    isDisabled: {
      type: "boolean",
      default: false,
    },
  },
};

const pluginData = convertSchemaToPlugin(officialSchema);
console.log(JSON.stringify(pluginData, null, 2));
```

## API Reference

### Core Conversion Functions

#### `convertPluginToSchema(pluginData, options)`

Convert plugin format to official Spectrum JSON Schema.

**Parameters:**

* `pluginData` (Object): Component data in plugin format
  * `title` (string): Component title
  * `meta` (Object): Component metadata
    * `category` (string): Component category (actions, navigation, etc.)
    * `documentationUrl` (string): Documentation URL
  * `options` (Array): Component options
* `options` (Object): Conversion options
  * `description` (string, **required**): Component description
  * `includeSchemaMetadata` (boolean, default: true): Include $schema and $id fields

**Returns:** Official JSON Schema object

**Throws:** `SchemaConversionError` if conversion fails

**Example:**

```javascript
const schema = convertPluginToSchema(pluginData, {
  description: "A button component",
  includeSchemaMetadata: true,
});
```

#### `convertSchemaToPlugin(schema)`

Convert official Spectrum JSON Schema to plugin format.

**Parameters:**

* `schema` (Object): Official JSON Schema

**Returns:** Plugin format object

**Throws:** `SchemaConversionError` if conversion fails

**Example:**

```javascript
const pluginData = convertSchemaToPlugin(officialSchema);
```

### Validation Functions

#### `validatePluginFormat(data)`

Validate plugin format data structure.

**Parameters:**

* `data` (Object): Data to validate

**Returns:** `true` if valid

**Throws:** `SchemaConversionError` if validation fails

**Example:**

```javascript
import { validatePluginFormat } from "@adobe/component-schema-converter";

try {
  validatePluginFormat(pluginData);
  console.log("Valid plugin format!");
} catch (error) {
  console.error("Validation error:", error.message);
  console.error("Details:", error.details);
}
```

#### `validateOfficialSchema(schema)`

Validate official JSON Schema structure.

**Parameters:**

* `schema` (Object): Schema to validate

**Returns:** `true` if valid

**Throws:** `SchemaConversionError` if validation fails

#### `validateAgainstJsonSchema(schema)`

Validate schema against JSON Schema 2020-12 specification using Ajv.

**Parameters:**

* `schema` (Object): Schema to validate

**Returns:** `true` if valid

**Throws:** `SchemaConversionError` if validation fails

#### `validateConversionRequirements(data, options)`

Pre-flight check before converting plugin format to official schema.

**Parameters:**

* `data` (Object): Plugin data
* `options` (Object): Conversion options (including `description`)

**Returns:** `true` if data can be converted

**Throws:** `SchemaConversionError` if requirements are not met

### Utility Functions

#### Type Detection

* `isSizeEnum(values)`: Check if values represent size enum
* `isStateEnum(values)`: Check if values represent state enum
* `isIconRef(ref)`: Check if $ref points to workflow icon
* `isColorRef(ref)`: Check if $ref points to hex color
* `detectOptionType(property)`: Detect plugin option type from JSON Schema property
* `isValidHexColor(value)`: Validate hex color format
* `getValidSizeValues()`: Get array of valid size values
* `getStateKeywords()`: Get array of state keywords

#### Schema Generation

* `toKebabCase(title)`: Convert title to kebab-case
* `generateSchemaId(title)`: Generate $id URL for component
* `generateIconRef()`: Get workflow icon $ref URL
* `generateColorRef()`: Get hex color $ref URL
* `getSchemaBaseUrl()`: Get base URL for schemas
* `JSON_SCHEMA_VERSION`: JSON Schema version constant

#### Error Handling

* `SchemaConversionError`: Custom error class
* `createMissingFieldError(field)`: Create missing field error
* `createInvalidFieldError(field, expected, received, suggestion)`: Create invalid field error
* `createInvalidTypeError(type, validTypes)`: Create invalid type error
* `createValidationError(message, errors)`: Create validation error

## Type Mappings

### Plugin → Official

| Plugin Type  | Official Schema                                       |
| ------------ | ----------------------------------------------------- |
| `string`     | `{ type: "string" }`                                  |
| `boolean`    | `{ type: "boolean" }`                                 |
| `dimension`  | `{ type: "number" }`                                  |
| `localEnum`  | `{ type: "string", enum: [...] }`                     |
| `systemEnum` | `{ type: "string", enum: [...] }`                     |
| `size`       | `{ type: "string", enum: ["s", "m", "l", ...] }`      |
| `state`      | `{ type: "string", enum: ["default", "hover", ...] }` |
| `icon`       | `{ $ref: ".../workflow-icon.json" }`                  |
| `color`      | `{ $ref: ".../hex-color.json" }`                      |

### Official → Plugin

Type detection is automatic based on:

* `type: "boolean"` → `boolean`
* `type: "number"` → `dimension`
* `type: "string"` → `string`
* `type: "string"` + `enum` with size values → `size`
* `type: "string"` + `enum` with state keywords → `state`
* `type: "string"` + `enum` (other) → `localEnum`
* `$ref` to workflow-icon → `icon`
* `$ref` to hex-color → `color`

## Format Comparison

### Plugin Format Example

```json
{
  "title": "Button",
  "meta": {
    "category": "actions",
    "documentationUrl": "https://spectrum.adobe.com/page/button/"
  },
  "options": [
    {
      "title": "size",
      "type": "size",
      "items": ["s", "m", "l", "xl"],
      "defaultValue": "m",
      "required": false
    }
  ]
}
```

### Official Schema Example

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://opensource.adobe.com/spectrum-design-data/schemas/components/button.json",
  "title": "Button",
  "description": "Buttons allow users to perform an action.",
  "meta": {
    "category": "actions",
    "documentationUrl": "https://spectrum.adobe.com/page/button/"
  },
  "type": "object",
  "properties": {
    "size": {
      "type": "string",
      "enum": ["s", "m", "l", "xl"],
      "default": "m"
    }
  }
}
```

### Key Differences

* Plugin uses `options` array, official uses `properties` object
* Plugin uses explicit type strings (`size`, `icon`), official uses JSON Schema types
* Plugin uses `defaultValue`, official uses `default`
* Official requires `$schema`, `$id`, `description`, and `type: "object"`

See [`../../tools/component-options-editor/SCHEMA_COMPATIBILITY.md`](../../tools/component-options-editor/SCHEMA_COMPATIBILITY.md) for detailed comparison.

## Error Handling

All conversion and validation functions throw `SchemaConversionError` with detailed information:

```javascript
try {
  convertPluginToSchema(pluginData, { description: "Test" });
} catch (error) {
  console.error("Error:", error.message);
  console.error("Field:", error.details.field);
  console.error("Expected:", error.details.expected);
  console.error("Received:", error.details.received);
  console.error("Suggestion:", error.details.suggestion);
}
```

### Common Errors

**Missing Description:**

```javascript
// ❌ Error: Missing required field: options.description
convertPluginToSchema(pluginData);

// ✅ Correct
convertPluginToSchema(pluginData, {
  description: "Component description",
});
```

**Invalid Option Type:**

```javascript
// ❌ Error: Invalid option type: invalidType
{
  title: "test",
  type: "invalidType"  // Not a valid type
}

// ✅ Correct
{
  title: "test",
  type: "string"  // Valid type
}
```

**Enum Without Items:**

```javascript
// ❌ Error: localEnum options must have an items array
{
  title: "variant",
  type: "localEnum"  // Missing items
}

// ✅ Correct
{
  title: "variant",
  type: "localEnum",
  items: ["accent", "primary"]
}
```

**Invalid Size Values:**

```javascript
// ❌ Error: Invalid size values: small, large
{
  title: "size",
  type: "size",
  items: ["small", "large"]  // Invalid size values
}

// ✅ Correct
{
  title: "size",
  type: "size",
  items: ["s", "m", "l"]  // Valid size values
}
```

## Valid Values

### Categories

```javascript
import { getValidCategories } from "@adobe/component-schema-converter";

console.log(getValidCategories());
// ['actions', 'navigation', 'content', 'feedback', 'forms', 'layout', 'pickers', 'status']
```

### Option Types

```javascript
import { getValidOptionTypes } from "@adobe/component-schema-converter";

console.log(getValidOptionTypes());
// ['string', 'boolean', 'localEnum', 'systemEnum', 'size', 'state', 'icon', 'color', 'dimension']
```

### Size Values

```javascript
import { getValidSizeValues } from "@adobe/component-schema-converter";

console.log(getValidSizeValues());
// ['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl']
```

## Testing

Run tests with AVA:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

Tests include:

* **Unit tests**: Type detection, schema generation, converters, validators
* **Integration tests**: Real component schemas from `packages/component-schemas`
* **Round-trip tests**: Verify data preservation through bidirectional conversion

## Contributing

1. Follow the monorepo's coding standards (ES modules, conventional commits)
2. Add tests for new features (target >95% coverage)
3. Update this README for API changes
4. Use AVA for all tests
5. Include JSDoc documentation for all exported functions

## License

Apache 2.0

## Related

* [Component Options Editor](../../tools/component-options-editor/) - Figma plugin that uses this library
* [Component Schemas](../component-schemas/) - Official Spectrum component schemas
* [SCHEMA\_COMPATIBILITY.md](../../tools/component-options-editor/SCHEMA_COMPATIBILITY.md) - Detailed format comparison
