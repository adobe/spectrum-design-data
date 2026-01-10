# Schema Compatibility Documentation

## Overview

This document describes the relationship between the Component Options Editor plugin's data format and the official [Spectrum Design Data component schemas](https://github.com/adobe/spectrum-design-data/tree/main/packages/component-schemas).

## Purpose & Design Philosophy

The Component Options Editor uses a **simplified metadata format** designed for:

* Ease of authoring component options in Figma
* Human-readable JSON structure
* Flexibility for design system documentation needs

The official Spectrum Design Data uses **JSON Schema format** designed for:

* Formal validation of component properties
* Integration with design tokens and tooling
* Strict type definitions for implementation

## Structure Comparison

### Official Spectrum Design Data Schema

```json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://opensource.adobe.com/spectrum-design-data/schemas/components/button.json",
    "title": "Button",
    "description": "Buttons allow users to perform an action...",
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

### Plugin Schema (Simplified Format)

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
        },
        {
            "title": "variant",
            "type": "localEnum",
            "items": ["accent", "negative", "primary", "secondary"],
            "defaultValue": "accent",
            "required": false
        },
        {
            "title": "isDisabled",
            "type": "boolean",
            "defaultValue": false,
            "required": false
        }
    ]
}
```

## Key Differences

### 1. Structure

| Feature                   | Official Schema              | Plugin Schema           |
| ------------------------- | ---------------------------- | ----------------------- |
| **Root structure**        | Flat `properties` object     | `options` array         |
| **Property definition**   | Inline JSON Schema types     | Simplified type strings |
| **Component description** | Required `description` field | Not included            |
| **Schema metadata**       | `$schema`, `$id`, `type`     | Not included            |

**Rationale**: The plugin uses an array structure to maintain ordering and simplify iteration in the UI. JSON Schema uses a flat object for formal validation.

### 2. Type Representation

| Concept     | Official Schema                    | Plugin Schema                            |
| ----------- | ---------------------------------- | ---------------------------------------- |
| **String**  | `"type": "string"`                 | `"type": "string"`                       |
| **Boolean** | `"type": "boolean"`                | `"type": "boolean"`                      |
| **Enum**    | `"enum": [...]`                    | `"type": "localEnum"` + `"items": [...]` |
| **Size**    | `"enum": ["s", "m", ...]`          | `"type": "size"` + `"items": [...]`      |
| **State**   | `"enum": ["hover", ...]`           | `"type": "state"` + `"items": [...]`     |
| **Icon**    | `"$ref": ".../workflow-icon.json"` | `"type": "icon"` + `"defaultValue"`      |
| **Color**   | `"$ref": ".../hex-color.json"`     | `"type": "color"` + `"defaultValue"`     |

**Rationale**: The plugin uses explicit type strings to drive UI rendering (different forms for different types). JSON Schema uses standard types with constraints.

### 3. Default Values

| Feature      | Official Schema            | Plugin Schema           |
| ------------ | -------------------------- | ----------------------- |
| **Syntax**   | `"default": value`         | `"defaultValue": value` |
| **Location** | Inside property definition | Inside option object    |

**Rationale**: Consistent naming across all option types in the plugin.

### 4. Required Fields

| Feature    | Official Schema                          | Plugin Schema                    |
| ---------- | ---------------------------------------- | -------------------------------- |
| **Syntax** | `"required": ["prop1", "prop2"]` at root | `"required": boolean` per option |
| **Scope**  | Array of required property names         | Boolean flag on each option      |

**Rationale**: The plugin's per-option boolean is more intuitive for UI editing.

## Compatible Features

✅ **Component Metadata**

* Both use `title` for component name
* Both use `meta.category` with same 8 categories
* Both use `meta.documentationUrl`

✅ **Option Types**

* String, boolean, and enum types are conceptually equivalent
* Size and state types map to specific enum patterns
* Icon and color types use the same validation rules

✅ **Default Values**

* Both support default values for all option types
* Same value formats (strings, booleans, etc.)

✅ **Description Field**

* Plugin supports optional `description` on options
* Official schema supports `description` on properties

## Incompatible/Different Features

❌ **Component Description**

* **Official**: Required `description` field at root level
* **Plugin**: Not included
* **Impact**: Plugin data cannot be directly validated against official schema
* **Workaround**: Add description field in future version or during export

❌ **Schema Validation Metadata**

* **Official**: Includes `$schema`, `$id`, `type` fields
* **Plugin**: Not included
* **Impact**: Plugin JSON is not a valid JSON Schema document
* **Workaround**: These can be added programmatically during conversion

❌ **Property Structure**

* **Official**: Flat object with property names as keys
* **Plugin**: Array of option objects with `title` property
* **Impact**: Cannot directly merge or validate
* **Workaround**: Requires transformation layer for conversion

⚠️ **State Type Flexibility**

* **Official**: Each component defines its own state enum (e.g., "keyboard focus", "focus + hover")
* **Plugin**: Generic state type with customizable values
* **Impact**: Plugin is more flexible but less prescriptive
* **Benefit**: Allows authoring any state pattern needed

⚠️ **Icon Type**

* **Official**: Uses `$ref` to external workflow-icon.json with 900+ icons
* **Plugin**: Simplified picker with subset of common icons
* **Impact**: Plugin may not include all available icons
* **Workaround**: Expand icon list or allow free-text input

## Conversion Strategy

### Plugin → Official Schema

To convert plugin data to official Spectrum Design Data format:

1. **Add required fields**:
   * Add `$schema`, `$id`, `type: "object"`
   * Add `description` field (may need manual input)

2. **Transform structure**:

   ```javascript
   // Convert options array to properties object
   const properties = {};
   pluginData.options.forEach((option) => {
       properties[option.title] = convertOptionToProperty(option);
   });
   ```

3. **Convert types**:
   * `localEnum` → `enum` array
   * `size` → `enum` with size values
   * `state` → `enum` with state values
   * `icon` → `$ref` to workflow-icon.json
   * `color` → `$ref` to hex-color.json

4. **Handle required fields**:
   ```javascript
   const required = pluginData.options.filter((opt) => opt.required).map((opt) => opt.title);
   ```

### Official Schema → Plugin

To convert official schema to plugin format:

1. **Extract metadata**:
   * Copy `title` and `meta`
   * Store `description` separately (not in plugin format)

2. **Transform properties**:

   ```javascript
   const options = Object.entries(schema.properties).map(([key, prop]) => ({
       title: key,
       type: inferPluginType(prop),
       items: prop.enum || extractEnumFromRef(prop.$ref),
       defaultValue: prop.default,
       required: schema.required?.includes(key) || false,
       description: prop.description
   }));
   ```

3. **Infer plugin types**:
   * `enum` with size values → `size`
   * `enum` with state values → `state`
   * `$ref` to workflow-icon → `icon`
   * `$ref` to hex-color → `color`
   * Other `enum` → `localEnum`

## Recommendations

### For Plugin Users

1. **Use consistent naming**: Follow Spectrum naming conventions (camelCase, descriptive)
2. **Document thoroughly**: Use the description field to explain complex options
3. **Follow patterns**: Reference official Spectrum schemas for guidance on option structure
4. **Export carefully**: Be aware that plugin JSON is not directly compatible with official schemas

### For Future Development

1. **Add component description field**: Make plugin format more compatible
2. **Expand icon list**: Include all 900+ workflow icons from official schema
3. **Export converter**: Build tool to convert plugin format to official JSON Schema
4. **Import from schema**: Allow importing official schemas into the plugin
5. **Validation**: Add validation against official schema patterns

## Examples

### Example 1: Button Component

**Plugin Format**:

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
            "defaultValue": "m"
        },
        {
            "title": "variant",
            "type": "localEnum",
            "items": ["accent", "negative", "primary", "secondary"],
            "defaultValue": "accent"
        }
    ]
}
```

**Official Schema Equivalent**:

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
        }
    }
}
```

### Example 2: Icon and Color Options

**Plugin Format**:

```json
{
    "title": "Action Button",
    "meta": {
        "category": "actions",
        "documentationUrl": "https://spectrum.adobe.com/page/action-button/"
    },
    "options": [
        {
            "title": "icon",
            "type": "icon",
            "defaultValue": "Edit",
            "description": "Icon must be present if the label is not defined."
        },
        {
            "title": "staticColor",
            "type": "color",
            "defaultValue": "#FFFFFF"
        }
    ]
}
```

**Official Schema Equivalent**:

```json
{
    "properties": {
        "icon": {
            "$ref": "https://opensource.adobe.com/spectrum-design-data/schemas/types/workflow-icon.json",
            "description": "Icon must be present if the label is not defined."
        },
        "staticColor": {
            "$ref": "https://opensource.adobe.com/spectrum-design-data/schemas/types/hex-color.json"
        }
    }
}
```

## Conclusion

The Component Options Editor plugin and Spectrum Design Data schemas serve complementary purposes:

* **Plugin**: Optimized for authoring and documentation workflows in Figma
* **Official Schema**: Optimized for validation and implementation workflows

While not directly compatible, the formats can be converted with appropriate transformation logic. The plugin prioritizes ease of use and flexibility, while the official schemas prioritize formal validation and standardization.

For most use cases, the plugin format is sufficient for documentation purposes. For implementation or validation needs, consider building a conversion layer or exporting to the official format.
