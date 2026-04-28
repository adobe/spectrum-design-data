# Size Property Analysis Across Component Schemas

## Summary

**Total components with `size` property: 42**

The `size` property shows interesting patterns where components use subsets of a common t-shirt size scale, but not all components support the same range.

## String-Based T-Shirt Sizes

### Pattern 1: Standard \["s", "m", "l", "xl"] - 26 components

Most common pattern, representing the "standard" size range:

* action-group
* badge
* button
* button-group
* checkbox
* close-button
* combo-box
* detail
* field-label
* help-text
* in-field-progress-button
* in-field-progress-circle
* menu
* meter
* number-field
* picker
* progress-bar
* radio-group
* search-field
* status-light
* switch
* text-area
* text-field
* tree-view

**Token options**: `["small", "medium", "large", "extra-large"]`

### Pattern 2: Compact \["s", "m", "l"] - 8 components

Smaller range, no XL option:

* divider
* drop-zone
* illustrated-message
* progress-circle
* scroll-zoom-bar
* standard-dialog
* table
* tag-field
* tag-group

**Token options**: `["small", "medium", "large"]`

### Pattern 3: Extended Small \["xs", "s", "m", "l", "xl"] - 2 components

Adds extra-small to the standard range:

* action-button
* code

**Token options**: `["extra-small", "small", "medium", "large", "extra-large"]`

### Pattern 4: Compact with XS \["xs", "s", "m", "l"] - 3 components

Has extra-small but no extra-large:

* cards
* swatch
* swatch-group

**Token options**: `["extra-small", "small", "medium", "large"]`

### Pattern 5: Typography Full Range \["xs", "s", "m", "l", "xl", "xxl", "xxxl"] - 2 components

Full typography scale:

* body
* heading

**Token options**: `["extra-small", "small", "medium", "large", "extra-large", "extra-extra-large", "extra-extra-extra-large"]`

### Pattern 6: Limited \["m", "l"] - 1 component

Only two sizes:

* breadcrumbs

**Token options**: `["medium", "large"]`

## Number-Based Sizes

### Pattern 7: Pixel Values - 4 components

Size specified as number (pixels):

**avatar**: \[50, 75, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500]

* 17 distinct sizes
* Token options: Same as enum values (or map to descriptive names?)

**avatar-group**: \[50, 75, 100, 200, 300, 400, 500]

* Subset of avatar sizes (7 sizes)
* Token options: Same as enum values

**thumbnail**: \[50, 75, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]

* 12 distinct sizes
* Token options: Same as enum values

**color-wheel**: `{ "type": "number", "default": 192 }`

* No enum, free-form number
* No token options needed (continuous value)

## Key Insights

### 1. Common Core: s, m, l

The most common subset is `["s", "m", "l"]`, which appears in 34 components when you include those with xl.

### 2. Standard Extension: xl

26 components extend the core with `xl`, suggesting this is the "standard" for most interactive components.

### 3. Edge Cases

* **xs**: Used by 7 components, mostly for smaller UI elements (action-button, code, cards, swatches) or typography
* **xxl, xxxl**: Only typography components (heading, body) need these large sizes
* **Numeric sizes**: Reserved for components where size represents actual pixels (avatar, thumbnail)

### 4. Component Categories and Size Patterns

**Interactive Components** (buttons, fields, controls) → `["s", "m", "l", "xl"]`
**Typography** → Full range including `xxl`, `xxxl`
**Visual Elements** (avatars, thumbnails) → Numeric pixel values
**Layout Components** (dividers, tables) → Compact `["s", "m", "l"]`
**Decorative/Status** (badges, swatches) → Variable, sometimes includes `xs`

## Implications for Token Naming System

### Option 1: Hierarchical Option Sets

Define a hierarchy where larger sets include smaller ones:

```json
{
  "size-core": ["s", "m", "l"],
  "size-standard": ["s", "m", "l", "xl"],  // extends core
  "size-extended": ["xs", "s", "m", "l", "xl"],  // extends standard
  "size-typography": ["xs", "s", "m", "l", "xl", "xxl", "xxxl"],  // full range
  "size-limited": ["m", "l"],  // subset
  "size-compact-xs": ["xs", "s", "m", "l"]  // variant
}
```

Token options would map similarly:

```json
{
  "size-core-tokens": ["small", "medium", "large"],
  "size-standard-tokens": ["small", "medium", "large", "extra-large"],
  "size-extended-tokens": ["extra-small", "small", "medium", "large", "extra-large"],
  // etc.
}
```

### Option 2: Component-Specific Subsets

Each component declares which subset of the full size scale it supports:

```json
{
  "component": "button",
  "tokenNaming": {
    "options": {
      "size": {
        "schemaValues": ["s", "m", "l", "xl"],
        "tokenOptions": ["small", "medium", "large", "extra-large"],
        "optionSet": "size-standard"  // reference to canonical set
      }
    }
  }
}
```

### Option 3: Validation Rules

Define the full size scale and validate that component subsets are valid:

```json
{
  "fullSizeScale": ["xs", "s", "m", "l", "xl", "xxl", "xxxl"],
  "validationRule": "component size enum must be a contiguous subset of fullSizeScale",
  "exceptions": {
    "breadcrumbs": ["m", "l"],  // non-contiguous, but valid
    "avatar": "numeric"  // different type
  }
}
```

## Recommendations

1. **Create size "profiles"** that components can reference:
   * `size-profile-standard`: s, m, l, xl (most common)
   * `size-profile-compact`: s, m, l
   * `size-profile-extended`: xs, s, m, l, xl
   * `size-profile-typography`: xs through xxxl
   * `size-profile-numeric`: number type

2. **Map schema values to token options** explicitly:
   * Schema: "s" → Token: "small"
   * Schema: "xs" → Token: "extra-small"
   * Schema: "xxl" → Token: "extra-extra-large"
   * Numeric: Pass through as-is (or create descriptive names)

3. **Authoring tool should**:
   * Show which size profile a component uses
   * Suggest common profiles when editing
   * Validate that size subsets are coherent
   * Allow custom profiles for edge cases

4. **Consolidation approach**:
   * Don't force all components to use the same size range
   * Instead, consolidate the *mapping* from schema values to token options
   * Create reusable size profiles that components can inherit
