# Lexicon Typo and Consistency Analysis Report

## 🚨 Critical Issues Found

### 1. Spelling Error: "isDetatched" vs "isDetached"

**Issue**: Inconsistent spelling of "detached" across components.

**Files affected**:

- `packages/component-schemas/schemas/components/scroll-zoom-bar.json` - uses `"isDetatched"` (incorrect)
- `packages/component-schemas/schemas/components/tree-view.json` - uses `"isDetached"` (correct)

**Recommendation**:

- Fix `scroll-zoom-bar.json` to use `"isDetached"` (correct spelling)
- This is a clear typo that should be corrected

### 2. Enum/Default Value Mismatch: Divider Component

**Issue**: Default value doesn't match enum values.

**File**: `packages/component-schemas/schemas/components/divider.json`

**Problem**:

```json
"size": {
  "type": "string",
  "enum": ["s", "m", "l"],
  "default": "small"  // ❌ "small" is not in the enum
}
```

**Recommendation**:

- Change default to `"s"` to match the enum values
- Or add `"small"` to the enum if that's the intended value

## ⚠️ Consistency Issues

### 3. Size Value Inconsistencies

**Found size values**:

- `s`, `m`, `l`, `xl` (standard set)
- `xs`, `xxl`, `xxxl` (extended set)
- `small` (inconsistent with standard naming)

**Recommendation**:

- Standardize on either the short form (`s`, `m`, `l`, `xl`) or long form (`small`, `medium`, `large`, `extra-large`)
- Consider if `xs`, `xxl`, `xxxl` are needed or if they should be consolidated

### 4. Boolean Property Naming Patterns

**Current patterns found**:

- `is*` properties: 19 instances (e.g., `isDisabled`, `isRequired`)
- `has*` properties: 8 instances (e.g., `hasIcon`, `hasBadge`)
- `show*` properties: 4 instances (e.g., `showCheckbox`, `showValidIcon`)
- `hide*` properties: 7 instances (e.g., `hideLabel`, `hideIcon`)

**Recommendation**:

- The patterns are generally consistent
- Consider if `show*` and `hide*` could be consolidated (e.g., `showLabel` vs `hideLabel` could be `labelVisible`)

## 📊 Summary

**Total Issues Found**: 2 critical, 2 consistency issues

**Critical Issues**:

1. ✅ **Spelling Error**: `isDetatched` → `isDetached`
2. ✅ **Enum Mismatch**: Divider default value `"small"` not in enum

**Consistency Issues**: 3. ⚠️ **Size Values**: Mixed naming conventions (`s` vs `small`) 4. ⚠️ **Boolean Patterns**: Generally good, but could be more consistent

## 🔧 Recommended Actions

1. **Immediate fixes needed**:
   - Fix `isDetatched` → `isDetached` in scroll-zoom-bar.json
   - Fix divider.json default value to match enum

2. **Consider for future**:
   - Standardize size value naming convention
   - Review boolean property naming patterns for consistency

## 🎯 Impact Assessment

- **High Impact**: The spelling error could cause confusion and bugs
- **Medium Impact**: The enum mismatch could cause validation errors
- **Low Impact**: The consistency issues are more about maintainability

The lexicon is generally well-structured, with only minor issues that are easy to fix.
