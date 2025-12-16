# Token Files Analysis - Next Target Selection

## Overview

Analysis of all 8 token files in `packages/tokens/src` to determine parsing priority.

## File Statistics

| File                        | Lines  | Tokens | Complexity | Status                  |
| --------------------------- | ------ | ------ | ---------- | ----------------------- |
| layout.json                 | 2,697  | 242    | Medium     | ✅ **DONE**              |
| icons.json                  | 1,317  | 79     | Low        | 🎯 **RECOMMENDED NEXT** |
| typography.json             | 2,289  | 312    | Medium     | Later                   |
| color-component.json        | 598    | 73     | Low        | Later                   |
| semantic-color-palette.json | 551    | 94     | Low        | Later                   |
| color-aliases.json          | 2,407  | 169    | Low        | Later                   |
| color-palette.json          | 6,749  | 372    | Low        | Later                   |
| layout-component.json       | 11,912 | 997    | **High**   | Last                    |

## Detailed Analysis

### ✅ layout.json (COMPLETED)

* **242 tokens** - Global layout properties
* **Patterns identified:**
  * Spacing: `text-to-visual-50` (with spaceBetween)
  * Component property: `workflow-icon-size-50`
  * Global property: `corner-radius-75`
* **Result:** 100% match rate, perfect round-trip

***

### 🎯 icons.json (RECOMMENDED NEXT - 79 tokens)

**Why This Should Be Next:**

1. ✅ **Small scope**: Only 79 tokens (manageable)
2. ✅ **Clear patterns**: Consistent naming structure
3. ✅ **Similar to layout.json**: Uses component, sets (light/dark/wireframe)
4. ✅ **Builds on success**: Tests our existing parsing with theme variations
5. ✅ **Good learning**: Will help identify theme-based token patterns

**Token Patterns:**

```
icon-color-{color}-{property}-{state}
icon-color-{color}-background
```

**Examples:**

* `icon-color-blue-primary-default` → Component: icon, Color: blue, Property: primary, State: default
* `icon-color-blue-background` → Component: icon, Color: blue, Property: background
* `icon-color-brown-primary-hover` → Component: icon, Color: brown, Property: primary, State: hover

**Structure:**

```json
{
  "component": "icon",
  "$schema": "color-set.json",
  "sets": {
    "light": { "value": "{blue-900}", "uuid": "..." },
    "dark": { "value": "{blue-800}", "uuid": "..." },
    "wireframe": { "value": "{blue-900}", "uuid": "..." }
  }
}
```

**New Patterns to Support:**

* Color names: blue, brown, celery, chartreuse, etc.
* States: default, hover, down, disabled
* Properties: primary, secondary, background
* Theme sets: light, dark, wireframe

**Estimated Effort:** Low - Similar to layout.json patterns

***

### typography.json (312 tokens)

**Token Patterns:**

```
{style}-{variant}-{property}
{style}-cjk-{property}
{font-property}
```

**Examples:**

* `body-cjk-size-l` → Style: body, Variant: cjk, Property: size, Value: l
* `heading-cjk-font-family` → Style: heading, Variant: cjk, Property: font-family
* `black-font-weight` → Simple property

**Complexity:** Medium

* Multiple style types (body, heading, detail, code)
* CJK variants
* Multiple properties (font-family, font-weight, font-style, size, line-height)
* Mix of simple and compound patterns

**Estimated Effort:** Medium

***

### color-component.json (73 tokens)

**Token Patterns:**

```
{component}-{property}-{modifier}
{component}-{property}
```

**Examples:**

* `action-bar-border-color` → Component: action-bar, Property: border-color
* `avatar-opacity-disabled` → Component: avatar, Property: opacity, State: disabled
* `card-selection-background-color-opacity` → Complex compound

**Complexity:** Low-Medium

* Simple component-property pattern
* Some compound properties
* Mix of color and opacity

**Estimated Effort:** Low-Medium

***

### semantic-color-palette.json (94 tokens)

**Token Patterns:**

```
{semantic-name}-{variant}
{semantic-name}
```

**Examples:**

* Semantic color names
* Generally simpler patterns

**Complexity:** Low
**Estimated Effort:** Low

***

### color-aliases.json (169 tokens)

**Token Patterns:**

```
{color-name}-{shade}
{modifier}-{color-name}
```

**Complexity:** Low - Mostly alias tokens
**Estimated Effort:** Low

***

### color-palette.json (372 tokens)

**Token Patterns:**

```
{color-name}-{shade}
{color-name}
```

**Examples:**

* Base color definitions
* Systematic shades (50, 100, 200, etc.)

**Complexity:** Low - Very systematic
**Estimated Effort:** Low

***

### layout-component.json (997 tokens - LARGEST)

**Token Patterns:**

```
{component}-{anatomy}-to-{anatomy}-{density}-{size}
{component}-{property}-{size}
{component}-{anatomy}-to-{anatomy}
```

**Examples:**

* `accordion-bottom-to-text-compact-extra-large`
  * Component: accordion
  * SpaceBetween: bottom-to-text
  * Density: compact
  * Size: extra-large
* `accordion-content-area-edge-to-content-medium`
  * Component: accordion
  * Area: content-area
  * SpaceBetween: edge-to-content
  * Size: medium

**Complexity:** **HIGH**

* 997 tokens (largest file)
* Most complex patterns
* Multiple variants: density (compact, regular, spacious)
* Size modifiers: small, medium, large, extra-large
* Component-specific anatomy
* Nested relationships

**Estimated Effort:** High - Save for last when patterns are well understood

***

## Recommendation: Start with icons.json

### Rationale

1. **Manageable size**: 79 tokens is small enough to iterate quickly
2. **Pattern similarity**: Uses same `sets` structure as layout.json (already working)
3. **New pattern type**: Introduces color + state combinations
4. **Theme validation**: Tests light/dark/wireframe enum
5. **Incremental learning**: Builds confidence before tackling larger files
6. **Clear success metrics**: Easy to verify parsing accuracy

### Expected Patterns for icons.json

```javascript
{
  "icon-color-blue-primary-default": {
    "originalName": "icon-color-blue-primary-default",
    "parsed": {
      "type": "component-color-property",
      "component": "icon",
      "property": "color",
      "color": "blue",
      "variant": "primary",
      "state": "default"
    },
    "component": "icon",
    "$schema": "color-set.json",
    "sets": {
      "light": { "value": "{blue-900}", ... },
      "dark": { "value": "{blue-800}", ... },
      "wireframe": { "value": "{blue-900}", ... }
    },
    "validation": { "isValid": true, "errors": [] }
  }
}
```

### Enums to Add

* **colors.json**: blue, brown, celery, chartreuse, cyan, fuchsia, etc.
* **states.json**: default, hover, down, disabled, selected, focused
* **properties.json**: Add "background" to existing list

### Next Steps After icons.json

1. **typography.json** (312 tokens) - Test style/variant patterns
2. **color-component.json** (73 tokens) - More component-property variations
3. **semantic-color-palette.json** (94 tokens) - Semantic naming
4. **color-aliases.json** (169 tokens) - Alias patterns
5. **color-palette.json** (372 tokens) - Base palette
6. **layout-component.json** (997 tokens) - Final boss - most complex

***

## Summary

**Next Target:** `icons.json`

* **Size:** 79 tokens
* **Complexity:** Low
* **Similarity:** High (to completed layout.json)
* **Learning Value:** Theme sets, color patterns, states
* **Success Probability:** High

This will validate that our parsing framework can handle theme-based tokens before moving to more complex files.
