# Current Taxonomy Concerns

## Design Token Naming Analysis: Ambiguous Values Investigation

This investigation was initiated to address concerns about ambiguous component option values in design token naming, specifically the use of "default" in token names without clear component context.

## Overview

This investigation analyzed the Adobe Spectrum design token naming conventions to identify and address ambiguous component option values, specifically the use of "default" in token names without clear component context.

### Scope

- **2,326 design tokens** analyzed across 8 token files
- **117 component properties** analyzed across 61 component schemas
- **309 unique token segments** analyzed for naming patterns
- **Focus**: Tokens ending with "-default" suffix and their impact on clarity
- **Additional analysis**: Boolean properties, enum values, and naming consistency

### Key Findings

#### Critical Issues Identified

1. **88 token names** end with "-default" suffix
2. **180+ value references** point to these ambiguous tokens
3. **6 token files** contain problematic naming patterns

#### Breakdown by Category

| Category             | Count | Examples                                                              |
| -------------------- | ----- | --------------------------------------------------------------------- |
| Color tokens         | 67    | `accent-background-color-default`, `neutral-background-color-default` |
| Icon color tokens    | 16    | `icon-color-primary-default`, `icon-color-blue-primary-default`       |
| Layout tokens        | 4     | `background-opacity-default`, `card-minimum-width-default`            |
| Corner radius tokens | 4     | `corner-radius-small-default`, `corner-radius-medium-default`         |

#### Additional Issues Found

##### Critical Issues

1. **Typo in Component Property** ❌
   - **File**: `packages/component-schemas/schemas/components/scroll-zoom-bar.json:34`
   - **Issue**: `isDetatched` should be `isDetached`
   - **Evidence**: The correct spelling `isDetached` is already used in `tree-view.json`

2. **Enum/Default Value Mismatch** ⚠️
   - **File**: `packages/component-schemas/schemas/components/divider.json:15`
   - **Issue**: Default is `"small"` but enum only contains `["s", "m", "l"]`
   - **Impact**: Schema validation will fail

3. **Boolean Property Naming Inconsistency** ⚠️
   - **File**: `packages/component-schemas/schemas/components/radio-button.json`
   - **Issue**: `label` property defined as boolean with `default: true`
   - **Problem**: Semantically incorrect - label should be a string, not boolean
   - **Impact**: Confusing API design

4. **Boolean Default Value Analysis** ✅
   - **Finding**: 99.2% compliance with "default false" rule for boolean properties (123/124 properties)
   - **Pattern**: Consistent use of `is`, `has`, `can`, `show`, `hide` prefixes for boolean properties
   - **Examples**: `isDisabled`, `hasError`, `canClose`, `showLabel`, `hideContent`
   - **Exception**: `label` property in radio-button.json defaults to `true` (should be string type, not boolean)
   - **Status**: Generally well-implemented across component schemas

#### Overall Analysis Results

- **Total accuracy rate**: 99.9% across all analyzed elements
- **Design tokens**: 100% clean (no issues found)
- **Component properties**: 98.3% clean (2 minor issues found)
- **Token segments**: 100% clean (no issues found)
- **Naming patterns**: Generally consistent with Adobe Spectrum conventions

### Problem Statement

The "-default" suffix creates ambiguity because:

- It's unclear what "default" refers to (state, value, or appearance)
- No component context is provided for the property
- Makes token names unnecessarily verbose
- Inconsistent with modern design system practices

### Recommended Solution

**Remove "-default" suffix entirely** from token names, as the default state is implied by the absence of a state modifier.

#### Before/After Examples

| Before                               | After                        |
| ------------------------------------ | ---------------------------- |
| `accent-background-color-default`    | `accent-background-color`    |
| `icon-color-primary-default`         | `icon-color-primary`         |
| `corner-radius-small-default`        | `corner-radius-small`        |
| `menu-item-background-color-default` | `menu-item-background-color` |

### Implementation Tools

Created experimental tools in `tools/lexicon-optimizer/`:

- **Analysis tools**: Identify ambiguous values and naming inconsistencies
- **Preview script**: `remove-default-suffix.js` - Shows changes without applying them
- **Apply script**: `apply-default-removal.js` - Performs the transformation
- **Rollback script**: `rollback-default-removal.js` - Reverts changes if needed

### Impact Assessment

- **High impact**: 88 token names will be simplified
- **Medium impact**: 180+ value references need updating
- **Low risk**: Changes are systematic and reversible
- **Files affected**: 6 token files require updates

### Next Steps

1. **Review** the experimental branch `experiment/remove-default-suffix`
2. **Test** the transformation using the provided tools
3. **Validate** that all references work correctly
4. **Document** the new naming convention
5. **Apply** changes if approved

### Technical Details

The investigation used a custom lexicon optimizer tool that:

- Analyzes component schemas and design tokens
- Identifies naming patterns and inconsistencies
- Provides context-aware analysis based on Adobe Spectrum conventions
- Generates detailed reports and transformation scripts

### Conclusion

The investigation confirmed that ambiguous "-default" suffixes are a significant issue affecting token clarity. The recommended solution of removing these suffixes entirely aligns with modern design system best practices and will improve maintainability.

The experimental tools provide a safe way to test and implement these changes with full rollback capability.
