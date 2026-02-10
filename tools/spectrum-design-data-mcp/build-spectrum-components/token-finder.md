# Token Finder Agent Skill

## Overview

This Agent Skill helps AI agents discover the right Spectrum design tokens for design decisions, component styling, and visual design tasks. It orchestrates token discovery tools to find appropriate tokens based on use cases, design intent, and component context.

## When to Use

Activate this skill when:

* User asks about colors, spacing, typography, or other design tokens
* User needs to find tokens for a specific design decision
* User wants recommendations for styling components
* User asks "what token should I use for..."
* User needs help with design system values

## Workflow

### Step 1: Understand the Design Intent

Determine the semantic intent:

* **Intent**: primary, secondary, accent, negative, positive, notice, informative
* **State**: default, hover, focus, active, disabled, selected
* **Context**: button, input, text, background, border, icon

### Step 2: Get Design Recommendations

Use `get-design-recommendations` for semantic decisions:

```json
{
  "intent": "primary",
  "state": "hover",
  "context": "button"
}
```

This returns high-confidence token recommendations organized by:

* Colors (semantic and component)
* Layout (spacing, sizing)
* Typography (if text context)

### Step 3: Find Tokens by Use Case

For specific use cases, use `find-tokens-by-use-case`:

```json
{
  "useCase": "button background",
  "componentType": "button"
}
```

Common use cases:

* **Colors**: "button background", "text color", "border color", "icon color"
* **Spacing**: "spacing", "padding", "margin", "gap"
* **Typography**: "font", "heading", "body text", "label"
* **States**: "error state", "hover state", "disabled state", "selected state"
* **Components**: "button", "input", "card", "modal"

### Step 4: Get Token Details

Once you've identified candidate tokens, use `get-token-details` for complete information:

```json
{
  "tokenPath": "accent-color-100",
  "category": "semantic-color-palette"
}
```

This returns:

* Token value
* Description
* Deprecation status
* Related tokens
* Usage information

### Step 5: Explore Component Tokens

For component-specific styling, use `get-component-tokens`:

```json
{
  "componentName": "button"
}
```

This returns all tokens related to a specific component, organized by category.

## Example: Finding Button Colors

### User Request

"What colors should I use for a primary button?"

### Agent Workflow

1. **Get recommendations**: `get-design-recommendations` with `{"intent": "primary", "context": "button"}`
   * Returns: `accent-color-100`, `accent-color-200`, etc.

2. **Find by use case**: `find-tokens-by-use-case` with `{"useCase": "button background", "componentType": "button"}`
   * Returns component-specific background tokens

3. **Get details**: `get-token-details` for each recommended token
   * Verify values and check for deprecation

4. **Combine results**: Present both semantic and component-specific options

### Result

```json
{
  "recommended": {
    "default": "accent-color-100",
    "hover": "accent-color-200",
    "pressed": "accent-color-300"
  },
  "textColor": "text-color-primary",
  "borderColor": "accent-border-color"
}
```

## Example: Finding Spacing Tokens

### User Request

"What spacing should I use between form fields?"

### Agent Workflow

1. **Find by use case**: `find-tokens-by-use-case` with `{"useCase": "spacing", "componentType": "input"}`
   * Returns layout and spacing tokens

2. **Get component tokens**: `get-component-tokens` with `{"componentName": "text-field"}`
   * Find field-specific spacing tokens

3. **Get recommendations**: `get-design-recommendations` with `{"context": "spacing"}`
   * Get semantic spacing recommendations

### Result

```json
{
  "recommended": {
    "fieldSpacing": "spacing-300",
    "fieldPadding": "spacing-200",
    "labelSpacing": "spacing-100"
  }
}
```

## Example: Finding Error State Tokens

### User Request

"What tokens should I use for error messaging?"

### Agent Workflow

1. **Get recommendations**: `get-design-recommendations` with `{"intent": "negative", "context": "text"}`
   * Returns semantic negative/error colors

2. **Find by use case**: `find-tokens-by-use-case` with `{"useCase": "error state"}`
   * Returns error-specific tokens

3. **Get details**: `get-token-details` for key tokens
   * Verify error color values

### Result

```json
{
  "recommended": {
    "textColor": "negative-color-100",
    "backgroundColor": "negative-background-color-default",
    "borderColor": "negative-border-color",
    "iconColor": "negative-color-100"
  }
}
```

## Decision Trees

### Color Selection

```
Is it semantic? (primary, error, success, etc.)
  → Use get-design-recommendations
  → Intent: primary/secondary/negative/positive/notice
  → Context: button/input/text/background/border

Is it component-specific?
  → Use get-component-tokens
  → Then find-tokens-by-use-case with componentType

Is it a specific use case?
  → Use find-tokens-by-use-case
  → UseCase: button background, text color, border, etc.
```

### Spacing Selection

```
Is it component-specific?
  → Use get-component-tokens
  → Look for layout-component tokens

Is it a general spacing need?
  → Use find-tokens-by-use-case
  → UseCase: spacing, padding, margin

Is it for a specific component part?
  → Use get-component-tokens
  → Then get-token-details for specific tokens
```

### Typography Selection

```
Is it for headings?
  → Use find-tokens-by-use-case
  → UseCase: heading, font

Is it for body text?
  → Use find-tokens-by-use-case
  → UseCase: body text, font

Is it component-specific?
  → Use get-component-tokens
  → Look for typography tokens
```

## Best Practices

1. **Start with semantics**: Use `get-design-recommendations` for semantic decisions (primary, error, etc.)
2. **Narrow with use cases**: Use `find-tokens-by-use-case` to narrow down options
3. **Verify details**: Always use `get-token-details` to check values and deprecation
4. **Consider states**: For interactive elements, get tokens for all states (default, hover, focus, disabled)
5. **Check component context**: Use `get-component-tokens` when styling specific components
6. **Avoid deprecated tokens**: Check `deprecated` flag in token details
7. **Use aliases**: Check for `renamed` property if a token is deprecated

## Token Categories

* **Color**: `color-palette`, `color-component`, `semantic-color-palette`, `color-aliases`
* **Layout**: `layout`, `layout-component`
* **Typography**: `typography`
* **Icons**: `icons`

## Related Tools

* `get-design-recommendations` - Semantic token recommendations
* `find-tokens-by-use-case` - Find tokens for specific use cases
* `get-component-tokens` - Get component-specific tokens
* `get-token-details` - Get detailed token information
* `query-tokens` - Search tokens by name/type/category
* `get-token-categories` - List all token categories

## Common Use Cases

### Colors

* "button background" → Background colors for buttons
* "text color" → Text/foreground colors
* "border color" → Border colors
* "error state" → Error/negative colors
* "hover state" → Hover state colors

### Spacing

* "spacing" → General spacing tokens
* "padding" → Padding tokens
* "margin" → Margin tokens
* "gap" → Gap tokens for flex/grid

### Typography

* "heading" → Heading font tokens
* "body text" → Body text tokens
* "label" → Label tokens
* "font" → Font family tokens

## Notes

* Always prefer semantic tokens (`semantic-color-palette`) over raw palette tokens
* Check for `private: true` - these are internal tokens not for public use
* Use `renamed` property to find replacement tokens for deprecated ones
* Token values may be references to other tokens (aliases)
* Some tokens are component-specific and should only be used with those components
