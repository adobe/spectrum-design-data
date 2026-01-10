# Token Options Mapping Analysis

## Key Finding: Two Different "Size" Systems

There are **two distinct concepts** that both relate to "size" but serve different purposes:

### 1. Component Options (T-Shirt Sizes for Token Names)

**Location**: `packages/structured-tokens/schemas/enums/component-options.json`

**Values**: `["small", "medium", "large", "extra-large", "quiet", "compact", "spacious"]`

**Purpose**: Used in token names as **options** that describe component variations

**Examples in actual tokens**:

```
component-to-menu-small
field-edge-to-alert-icon-extra-large
side-label-character-count-top-margin-medium
checkbox-control-size-small
field-top-to-disclosure-icon-compact-extra-large  // Multiple options!
character-count-to-field-quiet-small               // quiet + small
```

**Token Structure**:

```json
{
  "name": {
    "original": "field-edge-to-alert-icon-extra-large",
    "structure": {
      "category": "spacing",
      "component": "field",
      "spaceBetween": {"from": "edge", "to": "alert-icon"},
      "options": ["extra-large"]  // ← Full word
    }
  }
}
```

### 2. Size Scale Index (Numeric Scale)

**Location**: `packages/structured-tokens/schemas/enums/sizes.json`

**Values**: `["0", "25", "50", "75", "100", "200", "300", ..., "1500"]`

**Purpose**: Used as numeric **index** values for tokens that scale proportionally

**Examples in actual tokens**:

```
text-to-visual-50
corner-radius-75
spacing-100
```

**Token Structure**:

```json
{
  "name": {
    "original": "text-to-visual-50",
    "structure": {
      "category": "spacing",
      "spaceBetween": {"from": "text", "to": "visual"},
      "index": "50"  // ← Numeric
    }
  }
}
```

## The Mapping Gap

### Component Schemas Use Abbreviations

```json
// button.json
{
  "size": {
    "type": "string",
    "enum": ["s", "m", "l", "xl"],
    "default": "m"
  }
}
```

### Token Names Use Full Words

```json
{
  "options": ["small", "medium", "large", "extra-large"]
}
```

### Current Documented Mapping

From `tools/token-name-parser/PARSER_UPDATE_PLAN.md`:

```
T-shirt sizes in token names map to schema values:

* small → s
* medium → m
* large → l
* extra-large → xl
```

**BUT**: This mapping only exists in documentation, not in schemas!

## Real-World Usage Patterns

### Pattern 1: Single Size Option

```
Token: component-to-menu-small
Structure: {
  "options": ["small"]
}
```

### Pattern 2: Multiple Options (Size + Variant)

```
Token: field-top-to-disclosure-icon-compact-extra-large
Structure: {
  "options": ["compact", "extra-large"]
}
```

### Pattern 3: Variant Only (No Size)

```
Token: field-edge-to-alert-icon-quiet
Structure: {
  "options": ["quiet"]
}
```

### Pattern 4: Size + Variant in Different Order

```
Token: character-count-to-field-quiet-small
Structure: {
  "options": ["quiet", "small"]
}
```

## Component Options Analysis

### Size Options (4)

* `small` → Schema: "s"
* `medium` → Schema: "m"
* `large` → Schema: "l"
* `extra-large` → Schema: "xl"

Missing from component-options.json but present in component schemas:

* `xs` (extra-small) - Used in: action-button, code, cards, swatch, body, heading
* `xxl` (extra-extra-large) - Used in: body, heading
* `xxxl` (extra-extra-extra-large) - Used in: body, heading

### Variant Options (3)

* `quiet` → Schema property: `isQuiet: true` (boolean)
* `compact` → Schema property: spacing density variant
* `spacious` → Schema property: spacing density variant

## What Needs to Be Added to Schemas

### Option 1: Add Mapping to Base Component Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://opensource.adobe.com/spectrum-design-data/schemas/component.json",
  "properties": {
    // ... existing properties ...
  },
  "tokenNaming": {
    "type": "object",
    "description": "Metadata for token name generation",
    "properties": {
      "propertyToOptionMapping": {
        "type": "object",
        "description": "Maps component schema properties to token options",
        "additionalProperties": {
          "type": "object",
          "properties": {
            "schemaToToken": {
              "type": "object",
              "description": "Map from schema enum values to token option names",
              "additionalProperties": { "type": "string" }
            }
          }
        }
      }
    }
  }
}
```

Example in button.json:

```json
{
  "properties": {
    "size": {
      "type": "string",
      "enum": ["s", "m", "l", "xl"],
      "default": "m"
    }
  },
  "tokenNaming": {
    "propertyToOptionMapping": {
      "size": {
        "schemaToToken": {
          "s": "small",
          "m": "medium",
          "l": "large",
          "xl": "extra-large"
        }
      }
    }
  }
}
```

### Option 2: Global Mapping File

Create a new file `packages/component-schemas/schemas/schema-to-token-mappings.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://opensource.adobe.com/spectrum-design-data/schemas/schema-to-token-mappings.json",
  "title": "Schema to Token Mappings",
  "description": "Global mappings from component schema enum values to token name options",
  "mappings": {
    "size": {
      "xs": "extra-small",
      "s": "small",
      "m": "medium",
      "l": "large",
      "xl": "extra-large",
      "xxl": "extra-extra-large",
      "xxxl": "extra-extra-extra-large"
    },
    "density": {
      "compact": "compact",
      "spacious": "spacious"
    }
  }
}
```

Then components reference this:

```json
{
  "properties": {
    "size": {
      "enum": ["s", "m", "l", "xl"],
      "$tokenMapping": "size"  // references global mapping
    }
  }
}
```

## Missing Component Options

The current `component-options.json` is **incomplete**. It should include:

```json
{
  "enum": [
    "extra-small",      // ← MISSING (for xs)
    "small",
    "medium",
    "large",
    "extra-large",
    "extra-extra-large",  // ← MISSING (for xxl)
    "extra-extra-extra-large",  // ← MISSING (for xxxl)
    "quiet",
    "compact",
    "spacious"
  ]
}
```

## Implications for Authoring Tool

The authoring tool needs to:

1. **Display the mapping** clearly when editing component schemas:
   ```
   Component Property: size
   Schema Values: ["s", "m", "l", "xl"]
   Token Options: ["small", "medium", "large", "extra-large"]
   ```

2. **Allow editing the mapping** if components use non-standard abbreviations

3. **Validate consistency** between:
   * Component schema enum values
   * Token option mappings
   * Actual token names in the system

4. **Handle special cases**:
   * Boolean properties (isQuiet) → token option (quiet)
   * Numeric sizes (avatar: 50, 75, 100) → no mapping needed
   * Custom variants that don't have schema properties

5. **Support discovery**:
   * Show which components use which token options
   * Identify components with unmapped properties
   * Suggest adding missing mappings

## Recommended Approach

### Phase 1: Add Complete Mapping System

1. Extend base component schema with `tokenNaming` field
2. Add `propertyToOptionMapping` structure
3. Update `component-options.json` to include xs, xxl, xxxl

### Phase 2: Populate Existing Components

1. Add mappings to all components with size properties
2. Add mappings for boolean properties (isQuiet → quiet)
3. Document special cases (numeric sizes, custom variants)

### Phase 3: Build Authoring Tool

1. Display existing mappings
2. Allow editing/adding new mappings
3. Validate against actual token usage
4. Suggest consolidations where appropriate

## Size Profiles Revisited

Given this understanding, size profiles should include BOTH schema values AND token options:

```json
{
  "sizeProfiles": {
    "standard": {
      "schemaValues": ["s", "m", "l", "xl"],
      "tokenOptions": ["small", "medium", "large", "extra-large"],
      "usedBy": ["button", "text-field", "menu", ...]  // 26 components
    },
    "compact": {
      "schemaValues": ["s", "m", "l"],
      "tokenOptions": ["small", "medium", "large"],
      "usedBy": ["divider", "table", "progress-circle", ...]  // 8 components
    },
    "extended": {
      "schemaValues": ["xs", "s", "m", "l", "xl"],
      "tokenOptions": ["extra-small", "small", "medium", "large", "extra-large"],
      "usedBy": ["action-button", "code"]
    },
    "typography": {
      "schemaValues": ["xs", "s", "m", "l", "xl", "xxl", "xxxl"],
      "tokenOptions": ["extra-small", "small", "medium", "large", "extra-large", "extra-extra-large", "extra-extra-extra-large"],
      "usedBy": ["body", "heading"]
    }
  }
}
```

Components can then reference a profile instead of duplicating the mapping:

```json
{
  "properties": {
    "size": {
      "enum": ["s", "m", "l", "xl"],
      "$sizeProfile": "standard"
    }
  }
}
```
