# Color Aliases Parsing - Results

## Summary

Successfully parsed and structured **169 color alias tokens** from `color-aliases.json` with **88.8% validation rate**.

### Metrics

* **Total Tokens:** 169
* **Regeneration Match Rate:** 100% (169/169)
* **Schema Validation Rate:** 88.8% (150/169)
  * 150 semantic-alias tokens (valid)
  * 19 special/other tokens (need custom schemas)

***

## Token Categories

### 1. Semantic Alias - Color Set (150 tokens) ✅

Semantic color aliases that reference other tokens with theme-specific values.

**Examples:**

* `accent-background-color-default` → `{accent-color-900}` (light), `{accent-color-800}` (dark)
* `background-base-color` → references base background tokens
* `neutral-background-color-hover` → references neutral hover state
* `blue-visual-color` → references blue color token

**Pattern:** Semantic property names with optional states/modifiers

**Complexity:** 1-2 (referencedToken + property)

**Structure:**

```json
{
  "category": "semantic-alias",
  "property": "accent-background-color-default",
  "referencedToken": "accent-color-900"
}
```

***

### 2. Special Tokens (19 tokens) ⚠️

Tokens in `color-aliases.json` that have direct values instead of references. These are semantic value tokens that may need custom schemas.

#### 2a. Opacity Tokens (6 tokens)

Semantic opacity values with theme sets.

**Examples:**

* `overlay-opacity` → 0.4 (light/wireframe), 0.6 (dark)
* `opacity-disabled` → direct opacity values
* `background-opacity-default`, `background-opacity-hover`, etc.

#### 2b. Drop Shadow Color Tokens (9 tokens)

Semantic drop-shadow color values.

**Examples:**

* `drop-shadow-ambient-color` → rgba(0,0,0,0.08)
* `drop-shadow-color-100`, `drop-shadow-color-200`, `drop-shadow-color-300`
* `drop-shadow-emphasized-key-color`, etc.

#### 2c. Drop Shadow Composite Tokens (4 tokens)

Complete drop-shadow definitions (composite type).

**Examples:**

* `drop-shadow-emphasized` → full drop-shadow with x, y, blur, spread, color
* `drop-shadow-elevated`, `drop-shadow-dragged`, etc.

***

## Implementation Details

### Parser Updates

#### Enhanced Semantic Alias Detection

Extended the parser to detect color-set aliases:

```javascript
// Check if this is a color-set alias (sets contain alias references)
const isColorSetAlias = tokenData.$schema && tokenData.$schema.includes("color-set") &&
                        tokenData.sets && 
                        Object.values(tokenData.sets).some(set => 
                          set.$schema && set.$schema.includes("alias")
                        );
```

This upgrade converts "special" tokens to "semantic-alias" when they:

1. Have `color-set` schema
2. Have `sets` property
3. At least one set has `alias` schema

### Schemas Created

#### `semantic-alias-color-set-token.json`

Schema for semantic alias tokens with light/dark/wireframe theme sets.

**Properties:**

* `category`: "semantic-alias"
* `property`: The semantic property name
* `referencedToken`: Token being referenced (optional, extracted from first set)
* `notes`: "Semantic alias providing contextual naming"

**Extends:** `color-set-token.json`

### Validator Updates

* Loaded `semantic-alias-color-set-token.json` schema
* Mapped `semantic-alias` category with sets to the color-set schema
* Handles both regular aliases and color-set aliases

***

## Sample Structured Tokens

### Semantic Alias (Color Set)

```json
{
  "id": null,
  "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color-set.json",
  "sets": {
    "light": {
      "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/alias.json",
      "value": "{accent-color-900}",
      "uuid": "d9d8488d-9b38-47e0-9660-dcad040f3ca8"
    },
    "dark": {
      "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/alias.json",
      "value": "{accent-color-800}",
      "uuid": "f24eb871-6419-4cef-88a2-cca8548ae31e"
    },
    "wireframe": {
      "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/alias.json",
      "value": "{accent-color-900}",
      "uuid": "1f4f6c48-633c-4eb5-b7d6-bf5a9a7fde18"
    }
  },
  "name": {
    "original": "accent-background-color-default",
    "structure": {
      "category": "semantic-alias",
      "property": "accent-background-color-default",
      "referencedToken": "accent-color-900",
      "notes": "Semantic alias providing contextual naming"
    },
    "semanticComplexity": 1
  }
}
```

### Special Token (Opacity)

```json
{
  "name": {
    "original": "overlay-opacity",
    "structure": {
      "category": "special",
      "property": "overlay-opacity",
      "notes": "No index suffix detected"
    },
    "semanticComplexity": 0
  }
}
```

***

## Semantic Alias Patterns

Color aliases follow several naming patterns:

### 1. Role-Based Colors

* `accent-*` - Accent/primary action colors
* `neutral-*` - Neutral/default colors
* `informative-*`, `positive-*`, `negative-*`, `notice-*` - Status colors
* `background-*` - Background colors
* `disabled-*` - Disabled state colors

### 2. Property Types

* `*-background-color-*` - Background colors
* `*-content-color-*` - Content (text/icon) colors
* `*-visual-color` - Visual indicator colors
* `*-border-color-*` - Border colors

### 3. States

* `*-default` - Default state
* `*-hover` - Hover state
* `*-down` - Active/pressed state
* `*-key-focus` - Keyboard focus state
* `*-selected` - Selected state
* `*-selected-key-focus` - Selected + keyboard focus

### 4. Color-Specific Aliases

* `blue-*`, `red-*`, `green-*`, etc. - Color-specific semantic names

***

## Testing

All existing tests continue to pass:

```
✔ 19 tests passed
```

Parser works seamlessly with layout, color-palette, and color-aliases:

```bash
# Parse color-aliases
node tools/token-name-parser/src/index.js color-aliases
```

***

## Benefits

1. **High Coverage** - 88.8% of color alias tokens validated
2. **Semantic Richness** - Captures the semantic intent of color usage
3. **Theme Support** - Properly handles light/dark/wireframe aliases
4. **Reference Tracking** - Tracks which tokens are referenced
5. **Foundation for Tooling** - Enables token recommendation and validation

***

## Known Limitations

### 19 Special Tokens (11.2%)

These tokens are in `color-aliases.json` but have direct values instead of references:

1. **Opacity tokens** (6) - Need opacity-semantic schema
2. **Drop-shadow colors** (9) - Need drop-shadow-color-semantic schema
3. **Drop-shadow composites** (4) - Need drop-shadow-semantic schema

These tokens regenerate correctly (100% match rate) but lack specific schemas. They may belong in different token files or need custom semantic value schemas.

***

## Next Steps

Continue with remaining color files:

1. ✅ **color-palette.json** (372 tokens) - DONE
2. ✅ **color-aliases.json** (169 tokens) - DONE
3. **semantic-color-palette.json** (94 tokens) - Next
4. **color-component.json** (73 tokens)

Expected patterns for remaining files:

* **semantic-color-palette**: More semantic color definitions
* **color-component**: Component-specific color overrides
