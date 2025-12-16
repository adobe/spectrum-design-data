# Schema Coverage Analysis

## Overview

This document identifies areas where JSON schemas could be more specific instead of using loose wildcards.

## Summary of Findings

### ✅ Well-Defined Fields

* `id` - UUID format constraint
* `$schema` - URI format
* `category` - Strict enum with 6 values
* `spaceBetween.from` / `spaceBetween.to` - Enum reference to anatomy-parts
* `index` - Enum reference to sizes
* `semanticComplexity` - Integer with minimum 0

### ⚠️ Wildcard Fields (Could Be More Specific)

#### 1. Component Names

**Location:** `component-property-token.json` line 17-20

**Current Definition:**

```json
"component": {
  "type": "string",
  "description": "Component name"
}
```

**Actual Values Used in layout.json:**

* `border`
* `component`
* `corner-triangle-icon`
* `workflow-icon`

**Recommendation:**
✅ Already have `enums/components.json` with 63 values! Should reference it:

```json
"component": { "$ref": "enums/components.json" }
```

However, current data has components NOT in the enum:

* ❌ `border` - missing from enum
* ✅ `component` - exists in enum
* ❌ `corner-triangle-icon` - missing from enum
* ✅ `workflow-icon` - exists in enum

**Action Required:** Add missing components to enum, then add `$ref`.

***

#### 2. Component-Property Property Names

**Location:** `component-property-token.json` line 21-24

**Current Definition:**

```json
"property": {
  "type": "string",
  "description": "Property name"
}
```

**Actual Values Used in layout.json:**

* `height`
* `padding-vertical`
* `size`
* `width`

**Recommendation:**
✅ Already have `enums/properties.json` with 33 values!

Current data comparison:

* ✅ `height` - exists in enum
* ❌ `padding-vertical` - missing (enum only has `padding`)
* ✅ `size` - exists in enum
* ✅ `width` - exists in enum

**Action Required:**

1. Add `padding-vertical` to properties enum
2. Add `$ref` to schema:

```json
"property": { "$ref": "enums/properties.json" }
```

***

#### 3. Generic Property Names

**Location:** `generic-property-token.json` line 17-20

**Current Definition:**

```json
"property": {
  "type": "string",
  "description": "Property name"
}
```

**Actual Values Used in layout.json:**

* `corner-radius`
* `drop-shadow-blur`
* `drop-shadow-x`
* `drop-shadow-y`
* `spacing`

**Recommendation:**
All values ✅ already exist in `enums/properties.json`!

**Action Required:** Add `$ref`:

```json
"property": { "$ref": "enums/properties.json" }
```

***

#### 4. Semantic Alias Property Names

**Location:** `semantic-alias-token.json` line 27-30

**Current Definition:**

```json
"property": {
  "type": "string",
  "description": "The semantic property name"
}
```

**Actual Values:** 35 unique semantic property names including:

* `corner-radius-default`
* `drop-shadow-x`
* `drop-shadow-elevated-x`
* `drop-shadow-emphasized-default-x`
* `animation-duration-bounce-in`
* `animation-ease-in-out`
* etc.

**Recommendation:**
⚠️ **More complex** - these are semantic aliases that provide contextual names. They combine base properties with modifiers:

* `{property}-{semantic-modifier}` patterns
* Examples: `corner-radius-default`, `animation-duration-bounce-in`

**Options:**

1. **Pattern constraint** - Use regex to ensure structure
2. **Dynamic enum** - Extract and maintain list
3. **Leave as wildcard** - These are intentionally flexible for semantic context

**Recommended:** Option 3 (leave as wildcard) because semantic aliases are meant to be flexible and descriptive. Their value is in providing meaningful context, not in being constrained.

***

#### 5. Special Token Properties

**Location:** Currently validated but could have dedicated schema

**Current:** Special tokens use base schema with:

```json
{
  "category": "special",
  "property": "focus-indicator-thickness",
  "notes": "No index suffix detected"
}
```

**Actual Special Properties:**

* `android-elevation`
* `focus-indicator-thickness`
* `focus-indicator-gap`
* `component-to-menu-small/medium/large/extra-large`
* `component-size-*` (various sizing properties)

**Recommendation:**
Create `special-token.json` schema with enum of known special properties.

***

#### 6. Value Field

**Location:** `regular-token.json` line 15-23

**Current Definition:**

```json
"value": {
  "description": "The value of the token.",
  "anyOf": [
    { "type": "string" },
    { "type": "number" },
    { "type": "object" },
    { "type": "array" }
  ]
}
```

**Recommendation:**
⚠️ **This is intentionally loose** - token values vary by type:

* Dimensions: `"3px"`, `"2dp"`
* Colors: `"#FF0000"`, `"rgb(255, 0, 0)"`
* References: `"{other-token}"`

The actual type constraint comes from the `$schema` field pointing to the token-type schema (dimension.json, color.json, etc.). The structured schema focuses on NAME structure, not value validation.

**Action:** No change needed - this is correct.

***

## Implementation Priority

### High Priority (Easy Wins)

1. ✅ Add `$ref` to `generic-property-token.json` property field
2. ✅ Add `padding-vertical` to properties enum
3. ✅ Add `$ref` to `component-property-token.json` property field

### Medium Priority

4. ✅ Add `border`, `corner-triangle-icon` to components enum
5. ✅ Add `$ref` to `component-property-token.json` component field

### Low Priority

6. ⚠️ Create `special-token.json` schema with property enum
7. ⚠️ Consider pattern constraints for semantic-alias properties

### Not Recommended

* ❌ Constraining `value` field (correctly delegated to token-type schemas)
* ❌ Strict enum for semantic-alias properties (defeats their purpose)

***

## Validation Gap Summary

### Missing from Enums

* **Components:** `border`, `corner-triangle-icon`
* **Properties:** `padding-vertical`

### Schema References Not Using Enums

* `component-property-token.json` → `component` field
* `component-property-token.json` → `property` field
* `generic-property-token.json` → `property` field

### Intentionally Loose (Good)

* `semantic-alias-token.json` → `property` field (semantic flexibility)
* `regular-token.json` → `value` field (delegated to token-type schemas)
* `base-token.json` → `component`, `deprecated_comment` (optional metadata)

***

## Conclusion

The schemas have **good coverage** overall. The main improvements are:

1. Adding 3 missing enum values
2. Adding 3 `$ref` connections to existing enums

These changes would increase schema strictness from \~70% to \~90% coverage while maintaining necessary flexibility for semantic aliases and special cases.
