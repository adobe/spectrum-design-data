# Semantic Complexity

## What is Semantic Complexity?

**Semantic complexity** is a measure of how much contextual meaning a token name provides. It's calculated by counting the number of semantic fields present in a token's name structure, excluding the numeric index which only indicates scale position.

The more semantic fields a token has, the more specific and contextually meaningful it is for designers and engineers to use.

## Why is it Valuable?

Semantic complexity enables **token recommendation systems** and **linting tools** to guide users toward more contextually appropriate tokens.

For example, if someone uses `blue-800` (low semantic complexity), a tool could recommend `accent-color-800` or `focus-indicator-color` (higher semantic complexity) if those tokens reference the same base value but provide more contextual meaning about when and how to use them.

## How is it Calculated?

Each token's semantic complexity is calculated by counting the presence of these semantic fields:

* `component` = +1 (component-specific tokens)
* `spaceBetween` = +1 (relationship between anatomy parts)
* `property` = +1 (what the token describes)
* `referencedToken` = +1 (semantic aliasing)

**Not counted:**

* `index` - This is a scale position, not semantic context
* `category` - This is the token type classification

**Special cases:**

* `unknown` category tokens always return 0 (no parseable structure)

## Examples by Category

### Generic Property (Complexity: 1)

```javascript
{
  "original": "corner-radius-100",
  "structure": {
    "category": "generic-property",
    "property": "corner-radius",  // +1
    "index": "100"                // not counted
  },
  "semanticComplexity": 1
}
```

**Meaning:** Low complexity - describes WHAT it is (a corner radius) but not WHERE or WHEN to use it.

### Spacing (Complexity: 2)

```javascript
{
  "original": "text-to-visual-50",
  "structure": {
    "category": "spacing",
    "property": "spacing",              // +1
    "spaceBetween": {                   // +1
      "from": "text",
      "to": "visual"
    },
    "index": "50"                       // not counted
  },
  "semanticComplexity": 2
}
```

**Meaning:** Higher complexity - describes WHAT it is (spacing) and the RELATIONSHIP it defines (between text and visual elements).

### Component Property (Complexity: 2)

```javascript
{
  "original": "workflow-icon-size-50",
  "structure": {
    "category": "component-property",
    "component": "workflow-icon",   // +1
    "property": "size",             // +1
    "index": "50"                   // not counted
  },
  "semanticComplexity": 2
}
```

**Meaning:** Higher complexity - describes WHAT it is (size) and WHERE to use it (workflow-icon component).

### Semantic Alias (Complexity: 2)

```javascript
{
  "original": "accent-color-800",
  "structure": {
    "category": "semantic-alias",
    "property": "accent-color",           // +1
    "referencedToken": "blue-800",        // +1
    "index": "800"                        // not counted
  },
  "semanticComplexity": 2
}
```

**Meaning:** Higher complexity - describes WHAT it is (accent color) and provides semantic context through aliasing (it's specifically an accent, not just any blue).

### Special (Complexity: 1)

```javascript
{
  "original": "android-elevation",
  "structure": {
    "category": "special",
    "property": "android-elevation"   // +1
  },
  "semanticComplexity": 1
}
```

**Meaning:** Low complexity - one-off token without standard structure, only has property name.

### Unknown (Complexity: 0)

```javascript
{
  "original": "unparseable-name-xyz",
  "structure": {
    "category": "unknown",
    "raw": "unparseable-name-xyz"
  },
  "semanticComplexity": 0
}
```

**Meaning:** No complexity - pattern not recognized, no semantic structure can be extracted.

## Use Cases

### 1. Token Recommendation

When a user selects a low-complexity token, suggest higher-complexity alternatives that provide more context:

```javascript
// User selects: blue-800 (complexity: 1)
// Suggest alternatives:
// - accent-color-800 (complexity: 2) - for accent colors
// - focus-indicator-color (complexity: 2) - for focus states
// - primary-action-color (complexity: 2) - for primary actions
```

### 2. Linting and Code Review

Flag usage of low-complexity tokens in contexts where higher-complexity alternatives exist:

```javascript
// Warning: Consider using a more specific token
<Button color="blue-800" />  // Low complexity
// Suggestion:
<Button color="accent-color-800" />  // Higher complexity, clearer intent
```

### 3. Token Documentation

Sort or filter tokens by semantic complexity to help users discover more meaningful tokens:

```javascript
// High complexity tokens (most semantic context)
tokens.filter(t => t.name.semanticComplexity >= 2)

// Low complexity tokens (generic, reusable)
tokens.filter(t => t.name.semanticComplexity === 1)
```

### 4. Design System Governance

Track the ratio of high vs low complexity tokens to ensure the system provides adequate semantic guidance:

```javascript
const complexityDistribution = {
  0: tokens.filter(t => t.name.semanticComplexity === 0).length,
  1: tokens.filter(t => t.name.semanticComplexity === 1).length,
  2: tokens.filter(t => t.name.semanticComplexity === 2).length,
  "2+": tokens.filter(t => t.name.semanticComplexity > 2).length
};
```

## Token Hierarchy by Complexity

The semantic complexity naturally reflects the token hierarchy in design systems:

```
Complexity 0: Unknown/Unparseable
             ↓
Complexity 1: Base/Generic Properties
             (corner-radius-100, spacing-200)
             ↓
Complexity 2: Semantic Aliases & Context-Specific
             (accent-color-800, button-height-100, text-to-visual-50)
             ↓
Complexity 3+: Future - Highly Contextual
              (button-primary-background-color-hover, etc.)
```

## Future Enhancements

### Additional Semantic Fields

As token naming patterns evolve, additional fields may be counted:

* `modifiers` - State modifiers (hover, active, disabled)
* `states` - Interaction states
* `options` - T-shirt sizes or other options
* `themes` - Theme-specific context
* `platforms` - Platform-specific tokens

### Token Recommender Utility

A future utility could traverse the token reference chain to find all semantic aliases of a base token:

```javascript
import { recommendAlternatives } from '@adobe/token-name-parser';

// Find higher-complexity alternatives to a generic token
const alternatives = recommendAlternatives('blue-800', allTokens);
// Returns:
// [
//   { name: 'accent-color-800', complexity: 2, usage: 'accent colors' },
//   { name: 'focus-indicator-color', complexity: 2, usage: 'focus states' },
//   ...
// ]
```

## Summary

Semantic complexity provides a quantitative measure of how much contextual information a token name contains. This enables tooling to guide users toward more appropriate, semantically meaningful tokens, improving design system consistency and developer experience.

## Related Documentation

* [Token Name Structure Wiki](https://github.com/adobe/spectrum-design-data/wiki/Token-name-structure)
* [Anonymous Design Tokens RFC](https://github.com/adobe/spectrum-design-data/wiki/Anonymous-Design-Tokens)
* [ANONYMOUS\_TOKENS\_MIGRATION.md](./ANONYMOUS_TOKENS_MIGRATION.md)
