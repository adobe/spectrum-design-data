# Specific Issues Found in Component Schemas and Design Tokens

## 🚨 **Critical Issues Found**

### 1. **Typo in Component Property** ❌

**File**: `packages/component-schemas/schemas/components/scroll-zoom-bar.json`  
**Issue**: `isDetatched` should be `isDetached`  
**Line**: 34  
**Current**:

```json
"isDetatched": {
  "type": "boolean",
  "default": false
}
```

**Should be**:

```json
"isDetached": {
  "type": "boolean",
  "default": false
}
```

**Note**: The correct spelling `isDetached` is already used in `packages/component-schemas/schemas/components/tree-view.json` (line 17), showing this is indeed a typo.

### 2. **Enum/Default Value Mismatch** ⚠️

**File**: `packages/component-schemas/schemas/components/divider.json`  
**Issue**: Default value doesn't match enum values  
**Line**: 15  
**Current**:

```json
"size": {
  "type": "string",
  "enum": ["s", "m", "l"],
  "default": "small"
}
```

**Problem**: Default is `"small"` but enum only contains `["s", "m", "l"]`

**Solutions**:

- **Option A**: Change default to `"m"` (medium)
- **Option B**: Change enum to `["small", "medium", "large"]`
- **Option C**: Change default to `"s"` (small)

## 🔍 **Potential Issues in Token Segments**

The analysis found 5 potential typos in token segments with high similarity:

### 1. **content vs context** (86% similar)

- **Segments**: `content`, `context`
- **Status**: Both appear to be legitimate words
- **Recommendation**: ✅ No action needed - these are different concepts

### 2. **disclosure vs disclousure** (91% similar) ⚠️

- **Segments**: `disclosure`, `disclousure`
- **Status**: `disclousure` appears to be a typo of `disclosure`
- **Recommendation**: Search codebase for `disclousure` and correct to `disclosure`

### 3. **height vs weight** (83% similar)

- **Segments**: `height`, `weight`
- **Status**: Both are legitimate words
- **Recommendation**: ✅ No action needed - these are different concepts

### 4. **navigation vs navigational** (83% similar)

- **Segments**: `navigation`, `navigational`
- **Status**: Both are legitimate words (noun vs adjective)
- **Recommendation**: ✅ No action needed - these are different concepts

### 5. **swatch vs switch** (83% similar)

- **Segments**: `swatch`, `switch`
- **Status**: Both are legitimate words
- **Recommendation**: ✅ No action needed - these are different concepts

## 📊 **Summary**

### **Critical Issues**: 2

1. ❌ **Typo**: `isDetatched` → `isDetached` in scroll-zoom-bar.json
2. ⚠️ **Mismatch**: Divider size enum/default value inconsistency

### **Potential Issues**: 1

1. ⚠️ **Possible Typo**: `disclousure` → `disclosure` (needs verification)

### **False Positives**: 4

1. ✅ `content` vs `context` - different concepts
2. ✅ `height` vs `weight` - different concepts
3. ✅ `navigation` vs `navigational` - different concepts
4. ✅ `swatch` vs `switch` - different concepts

## 🎯 **Recommended Actions**

### **Immediate Fixes**:

1. **Fix the typo**: Change `isDetatched` to `isDetached` in scroll-zoom-bar.json
2. **Fix the mismatch**: Update divider.json to align enum and default values
3. **Verify disclousure**: Search for `disclousure` in the codebase and correct if found

### **Verification Needed**:

1. Search for `disclousure` in all files to confirm if it's a typo
2. Review divider size values to determine the correct approach

## ✅ **Overall Assessment**

Your naming system is **very clean** with only 2-3 actual issues found out of:

- 117 component properties
- 309 token segments
- 2,326 design tokens

This represents a **99.9% accuracy rate**, which is excellent for a design system of this scale!
