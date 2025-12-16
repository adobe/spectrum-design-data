# Parser Update Plan - Special Token Handling

## New Patterns to Handle

### 1. Spacing with Component Options

```
Pattern: {component}-{from}-to-{to}-{option1}-{option2}
Examples:
  - field-edge-to-alert-icon-quiet
  - field-top-to-disclosure-icon-compact-extra-large
  - component-to-menu-small

Structure:
  category: spacing
  component: field (optional)
  spaceBetween: {from: edge, to: alert-icon}
  options: [quiet] or [compact, extra-large]
```

### 2. Anatomy Part + Property (No Component)

```
Pattern: {anatomy-part}-{property}
Examples:
  - focus-indicator-gap
  - focus-indicator-thickness
  - text-underline-gap
  - text-underline-thickness

Structure:
  category: generic-property  
  anatomyPart: focus-indicator
  property: gap
```

### 3. Gradient Stops

```
Pattern: gradient-stop-{index}-{variant}
Examples:
  - gradient-stop-1-genai
  - gradient-stop-2-premium

Structure:
  category: generic-property
  property: gradient-stop
  index: 1
  variant: genai
```

### 4. Component Property with Calculation and State

```
Pattern: component-size-{calculation}-{state}
Examples:
  - component-size-difference-down
  - component-size-width-ratio-down

Structure:
  category: component-property
  component: component
  property: size
  calculation: difference | width-ratio | maximum-perspective | minimum-perspective
  state: down
```

### 5. Just Anatomy Part (No Property)

```
Pattern: {anatomy-part}
Example:
  - side-focus-indicator

Structure:
  category: special
  anatomyPart: side-focus-indicator
```

## Implementation Order

1. Spacing patterns (most specific → least specific)
   * With multiple options
   * With single option
   * With numeric index (existing)

2. Gradient stops (specific pattern)

3. Component properties (most specific → least specific)
   * With calculation and state
   * With anatomy part and property (4 parts)
   * With options (variable length)
   * With index (existing)
   * Without index (scale-set, existing)

4. Generic properties
   * Anatomy + property (2 parts)
   * Property + index (existing)
   * Compound property + index (existing)

5. Special catch-all

## Component Options Mapping

T-shirt sizes in token names map to schema values:

* `small` → `s`
* `medium` → `m`
* `large` → `l`
* `extra-large` → `xl`

Variants:

* `quiet` → `isQuiet: true`
* `compact` → spacing density
* `spacious` → spacing density

## New Schema Fields

### Spacing Token

```json
{
  "component": "field",
  "spaceBetween": {"from": "edge", "to": "alert-icon"},
  "options": ["quiet"]
}
```

### Component Property Token

```json
{
  "component": "component",
  "property": "size",
  "calculation": "width-ratio",
  "state": "down"
}
```

### Generic Property Token

```json
{
  "anatomyPart": "focus-indicator",
  "property": "gap"
}
```

or

```json
{
  "property": "gradient-stop",
  "index": "1",
  "variant": "genai"
}
```
