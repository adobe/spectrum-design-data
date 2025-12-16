# Color Tokens Parsing Plan

## File: color-palette.json (372 tokens)

## Identified Patterns

### 1. **Base Colors** (2 tokens)

Simple single-word colors without scales.

**Examples:**

* `white`
* `black`

**Structure:**

```json
{
  "category": "color-base",
  "color": "white"
}
```

**Complexity:** 1 (color only)

***

### 2. **Color Scales** (301 tokens)

Colors with numeric intensity scales (100-1600).

**Examples:**

* `blue-100`, `blue-200`, `blue-1600`
* `gray-100`, `gray-900`
* `red-100`, `red-1600`

**Pattern:** `{color}-{index}`

**Structure:**

```json
{
  "category": "color-scale",
  "color": "blue",
  "index": "100"
}
```

**Complexity:** 2 (color + index)

**Colors:** blue, brown, celery, chartreuse, cinnamon, cyan, fuchsia, gray, green, indigo, magenta, orange, pink, purple, red, seafoam, silver, turquoise, yellow (19 colors)

***

### 3. **Transparent Colors** (26 tokens)

Colors with transparency modifiers and opacity scales.

**Examples:**

* `transparent-white-25`, `transparent-white-100`, `transparent-white-1000`
* `transparent-black-25`, `transparent-black-100`, `transparent-black-1000`

**Pattern:** `transparent-{base-color}-{index}`

**Structure:**

```json
{
  "category": "color-scale",
  "modifier": "transparent",
  "color": "white",
  "index": "25"
}
```

**Complexity:** 3 (modifier + color + index)

***

### 4. **Static Colors** (40 tokens)

Static colors with scales (used for light/dark mode invariant colors).

**Examples:**

* `static-blue-900`, `static-blue-1000`
* `static-red-400`, `static-red-900`
* `static-turquoise-400`, `static-turquoise-800`

**Pattern:** `static-{color}-{index}`

**Structure:**

```json
{
  "category": "color-scale",
  "modifier": "static",
  "color": "blue",
  "index": "900"
}
```

**Complexity:** 3 (modifier + color + index)

**Colors:** blue, chartreuse, cyan, fuchsia, green, indigo, magenta, orange, purple, red, turquoise (11 colors)

***

### 5. **Gradient Stops** (3 tokens)

Gradient stop colors with specific variants (already seen in layout.json).

**Examples:**

* `gradient-stop-1-avatar`
* `gradient-stop-2-avatar`
* `gradient-stop-3-avatar`

**Pattern:** `gradient-stop-{index}-{variant}`

**Structure:**

```json
{
  "category": "gradient-color",
  "property": "gradient-stop",
  "index": "1",
  "variant": "avatar"
}
```

**Complexity:** 2 (property + variant)

***

## Implementation Strategy

### 1. Create Color-Specific Enums

**`enums/colors.json`** - Base color names

```json
{
  "enum": [
    "white", "black", 
    "blue", "brown", "celery", "chartreuse", "cinnamon", "cyan",
    "fuchsia", "gray", "green", "indigo", "magenta", "orange",
    "pink", "purple", "red", "seafoam", "silver", "turquoise", "yellow"
  ]
}
```

**`enums/color-modifiers.json`** - Color modifiers

```json
{
  "enum": ["transparent", "static"]
}
```

**`enums/color-indices.json`** - Color scale indices

```json
{
  "enum": [
    "25", "50", "75", 
    "100", "200", "300", "400", "500", 
    "600", "700", "800", "900", 
    "1000", "1100", "1200", "1300", "1400", "1500", "1600"
  ]
}
```

### 2. Update Parser

Add color token detection patterns:

```javascript
// Pattern: Base color (1 part)
if (parts.length === 1 && baseColors.includes(parts[0])) {
  return {
    category: "color-base",
    color: parts[0]
  };
}

// Pattern: Color scale (2 parts)
if (parts.length === 2 && /^\d+$/.test(parts[1])) {
  const colors = [/* all base colors */];
  if (colors.includes(parts[0])) {
    return {
      category: "color-scale",
      color: parts[0],
      index: parts[1]
    };
  }
}

// Pattern: Modified color scale (3 parts)
// transparent-white-100, static-blue-900
if (parts.length === 3 && /^\d+$/.test(parts[2])) {
  const modifiers = ["transparent", "static"];
  if (modifiers.includes(parts[0])) {
    return {
      category: "color-scale",
      modifier: parts[0],
      color: parts[1],
      index: parts[2]
    };
  }
}

// Pattern: Gradient stop with variant (4 parts)
if (parts.length === 4 && parts[0] === "gradient" && parts[1] === "stop") {
  return {
    category: "gradient-color",
    property: "gradient-stop",
    index: parts[2],
    variant: parts[3]
  };
}
```

### 3. Create Schemas

**`color-base-token.json`**

```json
{
  "properties": {
    "name": {
      "structure": {
        "category": { "const": "color-base" },
        "color": { "$ref": "enums/colors.json" }
      }
    }
  }
}
```

**`color-scale-token.json`**

```json
{
  "properties": {
    "name": {
      "structure": {
        "category": { "const": "color-scale" },
        "modifier": { "$ref": "enums/color-modifiers.json" },
        "color": { "$ref": "enums/colors.json" },
        "index": { "$ref": "enums/color-indices.json" }
      }
    }
  }
}
```

**`gradient-color-token.json`**

```json
{
  "properties": {
    "name": {
      "structure": {
        "category": { "const": "gradient-color" },
        "property": { "const": "gradient-stop" },
        "index": { "type": "string" },
        "variant": { "type": "string" }
      }
    }
  }
}
```

### 4. Create Templates

**`color-base-token.hbs`**

```handlebars
{{color}}
```

**`color-scale-token.hbs`**

```handlebars
{{#if modifier}}{{modifier}}-{{/if}}{{color}}-{{index}}
```

**`gradient-color-token.hbs`**

```handlebars
gradient-stop-{{index}}-{{variant}}
```

***

## Expected Results

### Pattern Coverage

* **372 tokens total**
* **100% pattern coverage expected**
  * 2 base colors
  * 301 color scales
  * 26 transparent colors
  * 40 static colors
  * 3 gradient colors

### Categories

* `color-base`: 2 tokens
* `color-scale`: 367 tokens (301 + 26 + 40)
* `gradient-color`: 3 tokens

### Complexity Distribution

* **Complexity 1:** 2 tokens (base colors)
* **Complexity 2:** 304 tokens (simple color scales + gradient stops)
* **Complexity 3:** 66 tokens (modified color scales)

***

## Benefits

1. **Simple, clean patterns** - Color tokens have very consistent naming
2. **High validation potential** - Can validate all 372 tokens (100%)
3. **Foundation for semantic colors** - Sets up patterns for color-aliases.json and semantic-color-palette.json
4. **Simpler than layout** - No anatomy parts, spacing, or complex relationships

***

## Next Steps After color-palette.json

1. **color-aliases.json** (169 tokens) - Will reference color-palette tokens
2. **semantic-color-palette.json** (94 tokens) - Semantic color names
3. **color-component.json** (73 tokens) - Component-specific colors

These will likely add new categories like:

* `color-alias` - References palette colors
* `semantic-color` - Semantic color names (e.g., `accent`, `negative`)
* `component-color` - Component-specific colors
