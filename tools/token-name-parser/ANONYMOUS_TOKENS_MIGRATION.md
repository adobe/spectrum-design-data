# Anonymous Tokens Migration

## Summary

We've successfully migrated from keyed token objects to an **Anonymous Token Array** structure, following the [Token name structure wiki](https://github.com/adobe/spectrum-design-data/wiki/Token-name-structure) and [Anonymous Design Tokens RFC](https://github.com/adobe/spectrum-design-data/wiki/Anonymous-Design-Tokens).

## Key Changes

### 1. Data Structure: Object → Array

**Before:**

```json
{
  "corner-radius-75": {
    "uuid": "ecb9d03a-7340-4b43-8aa7-f89eef9f3a20",
    "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/dimension.json",
    "value": "3px"
  }
}
```

**After:**

```json
[
  {
    "id": "ecb9d03a-7340-4b43-8aa7-f89eef9f3a20",
    "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/dimension.json",
    "value": "3px",
    "name": {
      "original": "corner-radius-75",
      "structure": {
        "category": "global-property",
        "property": "corner-radius",
        "index": "75"
      }
    },
    "validation": {
      "isValid": false,
      "errors": ["No type detected"]
    }
  }
]
```

### 2. Token Names → Name Objects

Token names are now structured objects with:

* `original`: The original hyphen-delimited name
* `structure`: Parsed components following the wiki taxonomy

### 3. Terminology Updates

| Old Term | New Term         | Reason                                                          |
| -------- | ---------------- | --------------------------------------------------------------- |
| `type`   | `category`       | Aligns with wiki (spacing, component-property, global-property) |
| `size`   | `index`          | Reflects numeric relationship between values, not absolute size |
| `uuid`   | `id`             | Standardizes on common identifier naming                        |
| `parsed` | `name.structure` | Clearer semantic meaning                                        |

### 4. Property Extraction

Properties are now explicitly identified:

**Spacing Tokens:**

```json
{
  "name": {
    "original": "text-to-visual-50",
    "structure": {
      "category": "spacing",
      "property": "spacing",
      "spaceBetween": {
        "from": "text",
        "to": "visual"
      },
      "index": "50"
    }
  }
}
```

**Global Property Tokens:**

```json
{
  "name": {
    "original": "corner-radius-75",
    "structure": {
      "category": "global-property",
      "property": "corner-radius",
      "index": "75"
    }
  }
}
```

**Component Property Tokens:**

```json
{
  "name": {
    "original": "workflow-icon-size-50",
    "structure": {
      "category": "component-property",
      "component": "workflow-icon",
      "property": "size",
      "index": "50"
    }
  }
}
```

## Results

### Parsing Statistics

* **Total tokens:** 242
* **Match rate:** 100% (all tokens regenerate correctly)
* **Validation:** 27 valid, 215 invalid (enums need expansion)

### Validation Breakdown by Category

| Category           | Total | Valid | Invalid | Notes                                   |
| ------------------ | ----- | ----- | ------- | --------------------------------------- |
| global-property    | 23    | 23    | 0       | ✅ Fully valid                           |
| component-property | 19    | 3     | 16      | Need to expand component/property enums |
| spacing            | 67    | 1     | 66      | Need to expand anatomy-parts enum       |
| special            | 119   | 0     | 119     | Need schema for special category        |
| unknown            | 14    | 0     | 14      | Need to identify patterns               |

## Benefits

### 1. Anonymous Structure

Tokens are no longer dependent on their names as keys, enabling:

* **Renaming:** Change token names without breaking data structure
* **Versioning:** Track name changes over time
* **Migration:** Easier to migrate between naming conventions

### 2. Explicit Semantics

Every token now explicitly declares:

* Its **category** (spacing, component-property, global-property)
* Its **property** (what attribute it defines)
* Its **index** (position in scale)
* Its **components** (anatomy parts, component names)

### 3. Schema Validation

JSON schemas can now validate:

* Token structure integrity
* Property/component naming consistency
* Anatomy part whitelists
* Index values

### 4. Round-trip Verification

* Original names can be perfectly regenerated from structured data
* No data loss in transformation
* 100% match rate confirmed

## Next Steps

### 1. Expand Enums

Update enum schemas to include all actual values:

* `anatomy-parts.json`: Add all "from/to" anatomy parts from spacing tokens
* `components.json`: Add all component names
* `properties.json`: Add all property names

### 2. Create Special Token Schema

Define schema for special tokens like:

* `focus-indicator-thickness`
* `focus-indicator-gap`
* `drop-shadow-x`, `drop-shadow-y`

### 3. Identify Unknown Patterns

Analyze the 14 unknown tokens to identify new patterns

### 4. Expand to Other Token Files

Apply the same parsing to:

* `color-aliases.json`
* Other token files in `packages/tokens/src/`

## Files Modified

### Parser & Logic

* `tools/token-name-parser/src/parser.js`
* `tools/token-name-parser/src/name-regenerator.js`
* `tools/token-name-parser/src/name-comparator.js`
* `tools/token-name-parser/src/validator.js`
* `tools/token-name-parser/src/token-generator.js`

### Schemas

* `packages/structured-tokens/schemas/structured-token.json`
* `packages/structured-tokens/schemas/spacing-token.json`
* `packages/structured-tokens/schemas/component-property-token.json`
* `packages/structured-tokens/schemas/global-property-token.json`

### Templates

* `tools/token-name-parser/templates/spacing-token.hbs`
* `tools/token-name-parser/templates/component-property-token.hbs`
* `tools/token-name-parser/templates/global-property-token.hbs`

### Tests

* `tools/token-name-parser/test/parser.test.js`
* `tools/token-name-parser/test/name-regenerator.test.js`
* `tools/token-name-parser/test/name-comparator.test.js`

## References

* [Token name structure wiki](https://github.com/adobe/spectrum-design-data/wiki/Token-name-structure)
* [Anonymous Design Tokens RFC](https://github.com/adobe/spectrum-design-data/wiki/Anonymous-Design-Tokens)
* [Taxonomy improvements project plan](https://wiki.corp.adobe.com/display/AdobeDesign/Taxonomy+improvements+project+plan)
