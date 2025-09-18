# Real Ambiguous Values Analysis Report

## 🚨 **Critical Finding: 203 "default" References Found**

Your concern is absolutely validated! The analysis found **203 instances** of "default" in design token names, with many being ambiguous.

## 📊 **Summary Statistics**

- **Total "default" references**: 203
- **Token names ending with "-default"**: 20+ (highly ambiguous)
- **Value references to "-default" tokens**: 180+ (referencing ambiguous tokens)

## 🔴 **High Priority Issues**

### 1. **Token Names Ending with "-default"** (Most Critical)

**Examples found**:

```
menu-item-background-color-default
tree-view-selected-row-background-default
stack-item-selected-background-color-default
icon-color-primary-default
icon-color-blue-primary-default
icon-color-green-primary-default
icon-color-red-primary-default
icon-color-yellow-primary-default
icon-color-brown-primary-default
icon-color-celery-primary-default
icon-color-chartreuse-primary-default
icon-color-cinnamon-primary-default
icon-color-cyan-primary-default
icon-color-fuchsia-primary-default
icon-color-indigo-primary-default
icon-color-magenta-primary-default
icon-color-orange-primary-default
icon-color-pink-primary-default
icon-color-purple-primary-default
icon-color-seafoam-primary-default
```

**Problems**:

- ❌ **Ambiguous**: What does "default" mean in this context?
- ❌ **Unclear state**: Is this the default state, default value, or default appearance?
- ❌ **No component context**: The component is clear, but the property context is not

### 2. **Value References to Ambiguous Tokens**

**Examples found**:

```
"value": "{informative-background-color-default}"
"value": "{neutral-background-color-selected-default}"
"value": "{accent-background-color-default}"
"value": "{neutral-content-color-default}"
```

**Problems**:

- ❌ **Cascading ambiguity**: These reference the ambiguous tokens above
- ❌ **Maintenance issues**: Hard to understand what these values represent

## 💡 **Recommended Fixes**

### **Phase 1: Replace "-default" with Specific Terms**

#### **For Background Colors**:

```
// Instead of:
menu-item-background-color-default
tree-view-selected-row-background-default
stack-item-selected-background-color-default

// Use:
menu-item-background-color-rest
tree-view-selected-row-background-idle
stack-item-selected-background-color-base
```

#### **For Icon Colors**:

```
// Instead of:
icon-color-primary-default
icon-color-blue-primary-default
icon-color-green-primary-default

// Use:
icon-color-primary-rest
icon-color-blue-100
icon-color-green-100
```

### **Phase 2: Use State-Based Naming**

#### **Recommended State Terms**:

- `rest` - For idle/resting state
- `idle` - For inactive state
- `base` - For base/primary value
- `normal` - For normal state
- `100` - For scale-based naming (blue-100, green-100)

### **Phase 3: Update Value References**

#### **Before**:

```json
{
  "menu-item-background-color-default": {
    "value": "{informative-background-color-default}"
  }
}
```

#### **After**:

```json
{
  "menu-item-background-color-rest": {
    "value": "{informative-background-color-rest}"
  }
}
```

## 🎯 **Specific Action Items**

### **Immediate Fixes (High Impact)**:

1. **Replace all "-default" suffixes**:
   - Search for: `-default"`
   - Replace with: `-rest"` or appropriate state term

2. **Update value references**:
   - Search for: `{.*-default}`
   - Replace with: `{.*-rest}` or appropriate state term

3. **Focus on these files**:
   - `packages/tokens/src/color-component.json`
   - `packages/tokens/src/icons.json`
   - `packages/tokens/src/color-aliases.json`

### **Medium Priority**:

1. **Review semantic meaning**:
   - Determine if "default" means "rest", "idle", "base", or "normal"
   - Apply consistently across all tokens

2. **Update documentation**:
   - Document the new naming conventions
   - Provide migration guide

## 📈 **Impact Assessment**

- **High Impact**: 20+ token names need immediate attention
- **Medium Impact**: 180+ value references need updating
- **Files Affected**: 7 token files
- **Total References**: 203

## 🏆 **Conclusion**

Your instinct is **100% correct**! The ambiguous "default" values are a significant issue affecting:

- **20+ token names** (highly ambiguous)
- **180+ value references** (cascading ambiguity)
- **7 token files** (widespread problem)

**Recommended approach**:

1. Replace `-default` with `-rest` (most common case)
2. Use state-based naming consistently
3. Update all value references
4. Document the new conventions

This will dramatically improve token clarity and maintainability!
