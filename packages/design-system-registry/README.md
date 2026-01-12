# Design System Registry

A single source of truth for design system terminology used across Spectrum tokens, component schemas, and anatomy.

## Overview

The Design System Registry provides a centralized, validated registry of terminology used throughout the Adobe Spectrum Design System. It ensures consistency in naming and helps prevent divergence across different packages and tools.

## Registries

The package includes the following registries:

* **sizes.json** - Size scale values (xs, s, m, l, xl, xxl, xxxl, numeric sizes)
* **states.json** - Interaction states (default, hover, focus, disabled, etc.)
* **variants.json** - Color and style variants (accent, negative, primary, etc.)
* **anatomy-terms.json** - Anatomical part names (edge, visual, text, icon, etc.)
* **components.json** - Spectrum component names
* **scale-values.json** - Numeric scale values (50, 75, 100, 200, etc.)
* **categories.json** - Component categories (actions, inputs, navigation, etc.)
* **platforms.json** - Platform names (desktop, mobile, web, iOS, Android)

## Installation

```bash
pnpm add @adobe/design-system-registry
```

## Usage

### Importing Registries

```javascript
import {
  sizes,
  states,
  variants,
  anatomyTerms,
  components,
  scaleValues,
  categories,
  platforms
} from '@adobe/design-system-registry';

// Access registry values
console.log(sizes.values); // Array of size values
console.log(states.values); // Array of state values
```

### Using Helper Functions

```javascript
import {
  sizes,
  getValues,
  findValue,
  hasValue,
  getDefault,
  getActiveValues
} from '@adobe/design-system-registry';

// Get all value IDs
const sizeIds = getValues(sizes);
// => ['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', ...]

// Find a value by ID or alias
const mediumSize = findValue(sizes, 'm');
const alsoMedium = findValue(sizes, 'medium'); // Using alias
// => { id: 'm', label: 'Medium', aliases: ['medium'], ... }

// Check if a value exists
if (hasValue(sizes, 'xl')) {
  console.log('XL is a valid size');
}

// Get the default value
const defaultSize = getDefault(sizes);
// => { id: 'm', label: 'Medium', default: true, ... }

// Get only non-deprecated values
const activeSizes = getActiveValues(sizes);
```

### Importing Individual Registry Files

```javascript
import sizesData from '@adobe/design-system-registry/registry/sizes.json' assert { type: 'json' };
import statesData from '@adobe/design-system-registry/registry/states.json' assert { type: 'json' };
```

## Registry Structure

Each registry file follows this JSON structure:

```json
{
  "$schema": "../schemas/registry-value.json",
  "type": "size",
  "description": "Standard size scale values used across Spectrum",
  "values": [
    {
      "id": "m",
      "label": "Medium",
      "aliases": ["medium"],
      "default": true,
      "usedIn": ["tokens", "component-options", "component-schemas"],
      "description": "Optional detailed description"
    }
  ]
}
```

### Value Properties

* **id** (required): Unique identifier
* **label** (required): Human-readable label
* **aliases**: Alternative names or spellings
* **description**: Detailed description
* **default**: Whether this is the default value
* **deprecated**: Whether this value is deprecated
* **usedIn**: Where this value is used (tokens, component-schemas, etc.)
* **category**: Category or grouping
* **value**: Actual value if different from ID
* **documentationUrl**: URL to documentation

## Validation

The registry includes JSON Schema validation and consistency checks:

```bash
# Validate all registries
pnpm run validate

# Run tests
pnpm test
```

The validation script checks for:

* JSON Schema compliance
* Duplicate IDs within a registry
* Duplicate aliases within a registry
* Multiple default values
* Required fields

## Development

### Running Tests

```bash
pnpm test
```

### Validating Registry

```bash
pnpm run validate
```

### Contributing

When adding new values to registries:

1. Ensure the value has a unique `id`
2. Provide a clear `label`
3. Add `aliases` for common alternative names
4. Set `usedIn` to indicate where it's used
5. Add `description` for clarity
6. Run validation to check for errors
7. Run tests to ensure consistency

## Used By

This registry is consumed by:

* `@adobe/spectrum-tokens` - Design tokens
* `@adobe/spectrum-component-api-schemas` - Component schemas
* `@adobe/component-options-editor` - Component options authoring tool
* Token validation tools
* Future anatomy editor

## Related Packages

* [@adobe/spectrum-tokens](../tokens) - Design tokens for Spectrum
* [@adobe/spectrum-component-api-schemas](../component-schemas) - Component API schemas

## License

Apache 2.0
