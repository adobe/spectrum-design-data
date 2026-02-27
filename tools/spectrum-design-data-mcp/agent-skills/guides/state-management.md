# State Management Guide

This guide helps AI agents handle component states correctly when building Spectrum components. Use `get-design-recommendations` with the `state` parameter to get token recommendations for each interactive state.

## Component States

Spectrum components support these common states:

| State    | Description                    | When to use                      |
| -------- | ------------------------------ | -------------------------------- |
| default  | Resting state, no interaction  | Initial render                   |
| hover    | Pointer over the component     | Mouse/touch hover                |
| focus    | Keyboard or programmatic focus | Focus ring, tab navigation       |
| active   | Pressed / in progress          | Click/tap in progress, loading   |
| disabled | Not interactive                | `isDisabled: true`               |
| selected | Toggle or selection state      | Checkboxes, tabs, selected items |

## Token Recommendations by State

Use `get-design-recommendations` with the appropriate `state` and `context`:

```json
{
  "intent": "primary",
  "state": "default",
  "context": "button"
}
```

### Buttons

For action buttons and buttons, request tokens for each state:

```json
// Default
{ "intent": "accent", "state": "default", "context": "button" }

// Hover
{ "intent": "accent", "state": "hover", "context": "button" }

// Focus (focus ring)
{ "intent": "accent", "state": "focus", "context": "button" }

// Active / pressed
{ "intent": "accent", "state": "active", "context": "button" }

// Disabled
{ "intent": "accent", "state": "disabled", "context": "button" }
```

### Inputs

For text fields and other inputs:

```json
// Default
{ "intent": "primary", "state": "default", "context": "input" }

// Focus (focused field)
{ "intent": "primary", "state": "focus", "context": "input" }

// Error / invalid
{ "intent": "negative", "state": "default", "context": "input" }

// Disabled
{ "intent": "primary", "state": "disabled", "context": "input" }
```

### Selection Components

For checkboxes, radio groups, tabs:

```json
// Unselected
{ "intent": "primary", "state": "default", "context": "button" }

// Selected
{ "intent": "primary", "state": "selected", "context": "button" }

// Selected + hover
{ "intent": "primary", "state": "hover", "context": "button" }
```

## Interaction Patterns and State Transitions

### Typical Button Flow

1. **default** → user hovers → **hover**
2. **hover** → user presses → **active**
3. **active** → user releases → **hover** or **default**
4. **default** → user tabs to element → **focus**
5. **focus** → user blurs → **default**

Always provide tokens for default, hover, focus, and disabled. Add active and selected when the component supports them.

### Form Field Flow

1. **default** → user focuses → **focus**
2. **focus** → validation fails → **default** with error styling (use intent `negative`)
3. **default** → field disabled → **disabled**

### Best Practices for State Combinations

1. **Cover all interactive states**: For buttons and links, include default, hover, focus, and disabled at minimum.
2. **Use semantic intents**: Use `intent: "negative"` for errors, `intent: "positive"` for success, `intent: "accent"` for primary actions.
3. **Consistent context**: Keep `context` aligned with the component type (button, input, text, background, border).
4. **Validate with schema**: After building stateful configs, use `validate-component-props` to ensure props like `isDisabled` and `variant` are valid.
5. **One recommendation call per state**: Call `get-design-recommendations` once per state you need; combine results into a single config object.

## Examples

### Example: Action Button with All States

```javascript
// 1. Get recommendations for each state
const defaultTokens = await getDesignRecommendations({
  intent: "accent",
  state: "default",
  context: "button",
});
const hoverTokens = await getDesignRecommendations({
  intent: "accent",
  state: "hover",
  context: "button",
});
const focusTokens = await getDesignRecommendations({
  intent: "accent",
  state: "focus",
  context: "button",
});
const disabledTokens = await getDesignRecommendations({
  intent: "accent",
  state: "disabled",
  context: "button",
});

// 2. Build config with schema props + state tokens
const config = {
  component: "action-button",
  props: { variant: "accent", size: "m" },
  states: {
    default: defaultTokens,
    hover: hoverTokens,
    focus: focusTokens,
    disabled: disabledTokens,
  },
};

// 3. Validate
await validateComponentProps({
  component: "action-button",
  props: config.props,
});
```

### Example: Text Field with Error State

```javascript
// Default and focus
const defaultInput = await getDesignRecommendations({
  intent: "primary",
  state: "default",
  context: "input",
});
const errorInput = await getDesignRecommendations({
  intent: "negative",
  state: "default",
  context: "input",
});

// Component supports validationState: "invalid"
const config = {
  component: "text-field",
  props: {
    label: "Email",
    validationState: "invalid",
    errorMessage: "Please enter a valid email",
  },
  tokens: {
    default: defaultInput,
    error: errorInput,
  },
};
```

### Example: Card with Hover

For containers like cards, use `context: "background"` or component-specific tokens:

```javascript
const defaultCard = await getDesignRecommendations({
  intent: "secondary",
  state: "default",
  context: "background",
});
const hoverCard = await getDesignRecommendations({
  intent: "secondary",
  state: "hover",
  context: "background",
});
```

## Related Tools

* `get-design-recommendations` – primary tool for state-based token recommendations
* `find-tokens-by-use-case` – e.g. "hover state", "disabled state", "error state"
* `get-component-tokens` – component-specific tokens that may include state variants
* `get-component-schema` – required props and enums (e.g. `isDisabled`, `validationState`)
* `validate-component-props` – validate final configuration

## See Also

* [Component Builder](../component-builder.md) – full workflow for building components
* [Token Finder](../token-finder.md) – discovering tokens by use case and intent
