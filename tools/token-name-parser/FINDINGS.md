# Token Name Parser - Findings Report

## Overview

Successfully parsed all 242 tokens from `packages/tokens/src/layout.json` with **100% name regeneration match rate**.

## Summary Statistics

* **Total Tokens**: 242
* **Match Rate**: 100.00% (all tokens can be reconstructed from parsed parts)
* **Valid Tokens**: 27 (11.2%)
* **Invalid Tokens**: 215 (88.8%)

## Token Type Breakdown

### Spacing Tokens (67 total)

* Pattern: `{anatomy}-to-{anatomy}-{size}`
* Valid: 1 (1.5%)
* Invalid: 66 (98.5%)
* **Issue**: Most anatomy parts not yet in enum whitelist

Examples:

* `text-to-visual-50` ✓
* `text-to-control-50` (control not in enum)
* `label-to-description-0` (label, description not in enum)

### Component Property Tokens (19 total)

* Pattern: `{component}-{property}-{size}`
* Valid: 3 (15.8%)
* Invalid: 16 (84.2%)
* **Issue**: Component names and compound properties need enum expansion

Examples:

* `workflow-icon-size-50` ✓
* `component-height-50` ✓
* `component-height-75` ✓

### Global Property Tokens (23 total)

* Pattern: `{property}-{size}`
* Valid: 23 (100%)
* Invalid: 0 (0%)
* **Success**: All global properties validated correctly!

Examples:

* `corner-radius-75` ✓
* `spacing-100` ✓
* `corner-radius-1000` ✓

### Special Tokens (119 total)

* Pattern: Various (no size suffix)
* Valid: 0
* Invalid: 119
* **Issue**: Need schemas for special patterns

Examples:

* `drop-shadow-x`, `drop-shadow-y`, `drop-shadow-blur`
* `android-elevation`
* Scale set tokens (have `sets` property)

### Unknown Tokens (14 total)

* Pattern: Unrecognized
* Valid: 0
* Invalid: 14
* **Issue**: Need to identify and categorize these patterns

## Next Steps

### 1. Expand Anatomy Parts Enum

Add missing anatomy parts to improve spacing token validation:

* `control`
* `label`
* `description`
* `workflow-icon` (appears in spaceBetween)
* `ui-icon`
* Additional component-specific anatomy parts

### 2. Create Schema for Special Tokens

Many tokens don't follow the `{parts}-{size}` pattern:

* Alias tokens (reference other tokens)
* Tokens with scale sets (desktop/mobile variations)
* Property tokens without size suffixes

### 3. Expand to Other Token Files

Apply parser to remaining token files:

* `icons.json`
* `layout-component.json`
* `color-*.json`
* `typography.json`

### 4. Refine Component and Property Enums

Extract more comprehensive lists from Excel and actual token usage:

* Multi-word components
* Compound properties
* Platform-specific variations

### 5. Excel Enhancement

The Excel file `spectrum-token-name-parts.xlsx` needs:

* Complete anatomy part cataloging
* Component naming standards
* Property naming standards
* Size scale documentation

## Validation by Type

```
global-property:   23/23  (100.0%) ✓
component-property: 3/19  ( 15.8%)
spacing:            1/67  (  1.5%)
special:            0/119 (  0.0%)
unknown:            0/14  (  0.0%)
```

## Achievements

✅ Successfully parsed all 242 layout.json tokens\
✅ 100% name regeneration match rate\
✅ Identified 5 distinct token patterns\
✅ Created comprehensive enum schemas\
✅ Established validation framework\
✅ Generated structured JSON output\
✅ Created comparison and validation reports

## Conclusion

The token name parser successfully demonstrates:

1. Token names CAN be parsed into structured, validated components
2. Handlebars templates CAN reconstruct original names from parsed data
3. The current naming has CONSISTENT patterns that can be formalized
4. Enum-based validation WORKS for enforcing naming standards

The 88.8% "invalid" rate is expected and valuable - it identifies exactly where enums need expansion and where naming patterns need documentation. This is the foundation for improving token taxonomy across all Spectrum tokens.
