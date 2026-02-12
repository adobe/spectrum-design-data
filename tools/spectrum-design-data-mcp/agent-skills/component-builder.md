# Component Builder Agent Skill

## Overview

This Agent Skill helps AI agents build Spectrum components correctly by orchestrating multiple MCP tools to discover component schemas, find appropriate tokens, and validate configurations.

## When to Use

Activate this skill when:

* User asks to build, create, or implement a Spectrum component
* User needs help with component props, variants, or configuration
* User wants to validate component usage
* User asks about component structure or API

## Workflow

### Step 1: Discover Component Schema

Use `get-component-schema` to understand the component's API:

```json
{
  "component": "action-button"
}
```

This returns:

* Available properties
* Required properties
* Property types and enums
* Default values
* Component description

### Step 2: Get Component-Specific Tokens

Use `get-component-tokens` to find all tokens related to this component:

```json
{
  "componentName": "action-button"
}
```

This returns tokens organized by category (color, layout, typography, etc.).

### Step 3: Find Tokens for Specific Use Cases

For each visual aspect (background, text, border, spacing), use `find-tokens-by-use-case`:

```json
{
  "useCase": "button background",
  "componentType": "action-button"
}
```

Common use cases:

* "button background" - for background colors
* "text color" - for text/foreground colors
* "border" - for border colors and styles
* "spacing" - for padding and margins
* "error state" - for error/negative states
* "hover state" - for interactive states

### Step 4: Get Design Recommendations

For semantic decisions, use `get-design-recommendations`:

```json
{
  "intent": "primary",
  "state": "default",
  "context": "button"
}
```

Common intents: "primary", "secondary", "accent", "negative", "positive", "notice", "informative"
Common states: "default", "hover", "focus", "active", "disabled", "selected"

### Step 5: Validate Component Configuration

Before finalizing, use `validate-component-props` to ensure correctness:

```json
{
  "component": "action-button",
  "props": {
    "variant": "accent",
    "size": "m",
    "isDisabled": false
  }
}
```

## Example: Building an Action Button

### User Request

"Create a primary action button with medium size"

### Agent Workflow

1. **Get schema**: `get-component-schema` with `{"component": "action-button"}`
   * Discover available props: variant, size, isDisabled, etc.

2. **Get tokens**: `get-component-tokens` with `{"componentName": "action-button"}`
   * Find all button-related tokens

3. **Find background token**: `find-tokens-by-use-case` with `{"useCase": "button background", "componentType": "action-button"}`
   * Get recommended background colors

4. **Get recommendations**: `get-design-recommendations` with `{"intent": "primary", "context": "button"}`
   * Get semantic color recommendations

5. **Build config**: Combine schema props with token recommendations:
   ```json
   {
     "variant": "accent",
     "size": "m",
     "style": {
       "backgroundColor": "accent-color-100",
       "color": "text-color-primary"
     }
   }
   ```

6. **Validate**: `validate-component-props` to ensure correctness

## Example: Building a Text Field

### User Request

"Create a text input with error state"

### Agent Workflow

1. **Get schema**: `get-component-schema` with `{"component": "text-field"}`
   * Discover validationError, isRequired, etc.

2. **Get tokens**: `get-component-tokens` with `{"componentName": "text-field"}`

3. **Find error tokens**: `find-tokens-by-use-case` with `{"useCase": "error state", "componentType": "input"}`
   * Get negative/error color tokens

4. **Get error recommendations**: `get-design-recommendations` with `{"intent": "negative", "context": "input"}`
   * Get semantic error colors

5. **Build config**:
   ```json
   {
     "validationState": "invalid",
     "errorMessage": "Please enter a valid value",
     "style": {
       "borderColor": "negative-border-color",
       "textColor": "negative-color-100"
     }
   }
   ```

## Best Practices

1. **Always validate**: Use `validate-component-props` before finalizing any component configuration
2. **Use semantic tokens**: Prefer `get-design-recommendations` for semantic decisions (primary, error, etc.)
3. **Check component options**: Use `get-component-options` for a user-friendly view of available props
4. **Combine multiple tools**: Don't rely on a single tool - combine schema + tokens + recommendations
5. **Handle states**: For interactive components, consider all states (default, hover, focus, disabled)

## Common Validation Errors & Solutions

### Missing Required Props

**Error:**

```
Missing required property: label
```

**Solution:**

* Check schema with `get-component-schema` to see required props
* Use `get-component-options` for user-friendly property list
* Add the required prop to your configuration

### Invalid Enum Value

**Error:**

```
Property variant value "primary" is not in allowed enum values
```

**Solution:**

* Check available values: `get-component-schema` shows enum options
* Common fix: "primary" → "accent" for accent buttons
* Use `suggest-component-improvements` for recommendations

### Unknown Property

**Error:**

```
Unknown property: color
```

**Solution:**

* Property might be named differently (e.g., `variant` instead of `color`)
* Check spelling with `get-component-options`
* Remove custom properties not in schema
* Use tokens through style props instead

## Related Tools

* `get-component-schema` - Get complete component API
* `get-component-tokens` - Find component-specific tokens
* `find-tokens-by-use-case` - Find tokens for specific use cases
* `get-design-recommendations` - Get semantic token recommendations
* `validate-component-props` - Validate component configuration
* `get-component-options` - User-friendly property discovery
* `search-components-by-feature` - Find components with specific features

## Common Components

* **Actions**: `action-button`, `button`, `action-group`, `action-bar`
* **Inputs**: `text-field`, `text-area`, `checkbox`, `radio-group`, `select-box`
* **Containers**: `card`, `popover`, `tray`, `dialog`, `alert-dialog`
* **Navigation**: `breadcrumbs`, `tabs`, `menu`, `side-navigation`
* **Feedback**: `alert-banner`, `toast`, `in-line-alert`, `status-light`

## Accessibility Checklist

When building components, ensure:

### Required Props

* [ ] Check schema for required ARIA props (`aria-label`, `aria-labelledby`, etc.)
* [ ] Verify keyboard navigation support (focus props, tab order)
* [ ] Include proper role attributes where needed

### States & Feedback

* [ ] Disabled state has appropriate ARIA attributes
* [ ] Error states include `aria-invalid` and error message association
* [ ] Loading states use `aria-busy` or `aria-live` regions
* [ ] Selected/checked states properly indicated

### Visual Design

* [ ] Color contrast meets WCAG AA standards (use semantic tokens)
* [ ] Focus indicators are clearly visible
* [ ] Interactive elements have adequate touch targets (44x44px minimum)
* [ ] Text sizing follows typography tokens (minimum 16px for body)

### Testing

* [ ] Test with screen reader (VoiceOver, NVDA, JAWS)
* [ ] Verify keyboard-only navigation works
* [ ] Check color contrast with tools
* [ ] Validate against component schema with `validate-component-props`

## Notes

* Always check if a component exists using `list-components` before building
* Use `get-component-options` with `detailed: true` for comprehensive property information
* For complex components, break down into smaller parts (container, content, actions)
* Consider accessibility: check for required ARIA props in the schema
* Follow Spectrum design patterns: use recommended tokens, not arbitrary values
