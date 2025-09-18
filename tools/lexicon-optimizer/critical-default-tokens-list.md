# Critical Token Names Ending with "-default"

## 🚨 **88 Token Names Requiring Immediate Attention**

### 📊 **Summary**

- **Total tokens ending with "-default"**: 88
- **Categories affected**: 6 main categories
- **Priority**: HIGH - All need immediate attention

---

## 🎨 **1. Color Tokens (67 tokens)**

### **Semantic Color Tokens (15 tokens)**

```
accent-background-color-default
accent-content-color-default
accent-subtle-background-color-default
informative-background-color-default
informative-subtle-background-color-default
negative-background-color-default
negative-border-color-default
negative-content-color-default
negative-subdued-background-color-default
negative-subtle-background-color-default
neutral-background-color-default
neutral-background-color-selected-default
neutral-content-color-default
neutral-subdued-background-color-default
neutral-subdued-content-color-default
neutral-subtle-background-color-default
notice-background-color-default
notice-subtle-background-color-default
positive-background-color-default
positive-subtle-background-color-default
```

### **Brand Color Tokens (40 tokens)**

```
blue-background-color-default
blue-subtle-background-color-default
brown-background-color-default
brown-subtle-background-color-default
celery-background-color-default
celery-subtle-background-color-default
chartreuse-background-color-default
chartreuse-subtle-background-color-default
cinnamon-background-color-default
cinnamon-subtle-background-color-default
cyan-background-color-default
cyan-subtle-background-color-default
fuchsia-background-color-default
fuchsia-subtle-background-color-default
gray-background-color-default
gray-subtle-background-color-default
green-background-color-default
green-subtle-background-color-default
indigo-background-color-default
indigo-subtle-background-color-default
magenta-background-color-default
magenta-subtle-background-color-default
orange-background-color-default
orange-subtle-background-color-default
pink-background-color-default
pink-subtle-background-color-default
purple-background-color-default
purple-subtle-background-color-default
red-background-color-default
red-subtle-background-color-default
seafoam-background-color-default
seafoam-subtle-background-color-default
silver-background-color-default
silver-subtle-background-color-default
turquoise-background-color-default
turquoise-subtle-background-color-default
yellow-background-color-default
yellow-subtle-background-color-default
```

### **Component Color Tokens (3 tokens)**

```
menu-item-background-color-default
stack-item-selected-background-color-default
tree-view-selected-row-background-default
```

---

## 🎯 **2. Icon Color Tokens (16 tokens)**

```
icon-color-blue-primary-default
icon-color-brown-primary-default
icon-color-celery-primary-default
icon-color-chartreuse-primary-default
icon-color-cinnamon-primary-default
icon-color-cyan-primary-default
icon-color-fuchsia-primary-default
icon-color-green-primary-default
icon-color-indigo-primary-default
icon-color-magenta-primary-default
icon-color-orange-primary-default
icon-color-pink-primary-default
icon-color-primary-default
icon-color-purple-primary-default
icon-color-red-primary-default
icon-color-seafoam-primary-default
icon-color-silver-primary-default
icon-color-turquoise-primary-default
icon-color-yellow-primary-default
```

---

## 📐 **3. Layout Tokens (4 tokens)**

```
background-opacity-default
card-horizontal-edge-to-content-default
card-minimum-width-default
tree-view-item-to-item-default
```

---

## 🔲 **4. Corner Radius Tokens (4 tokens)**

```
corner-radius-extra-large-default
corner-radius-large-default
corner-radius-medium-default
corner-radius-small-default
```

---

## 💡 **Recommended Replacements**

### **For Color Tokens**:

```
// Instead of:
accent-background-color-default
neutral-background-color-default
blue-background-color-default

// Use:
accent-background-color
neutral-background-color
blue-background-color
```

### **For Icon Color Tokens**:

```
// Instead of:
icon-color-primary-default
icon-color-blue-primary-default

// Use:
icon-color-primary
icon-color-blue-primary
```

### **For Layout Tokens**:

```
// Instead of:
background-opacity-default
card-minimum-width-default

// Use:
background-opacity
card-minimum-width
```

### **For Corner Radius Tokens**:

```
// Instead of:
corner-radius-small-default
corner-radius-medium-default

// Use:
corner-radius-small
corner-radius-medium
// or
corner-radius-100
corner-radius-200
```

---

## 🎯 **Action Plan**

### **Phase 1: High Priority (All 88 tokens)**

1. **Remove "-default" suffix entirely**:
   - Default state is implied by absence of state modifier
   - Cleaner, more concise naming
   - Follows design system best practices

### **Phase 2: Update References**

1. **Find all value references** to these tokens
2. **Update the references** to use new names
3. **Test** that all references are updated

### **Phase 3: Validation**

1. **Verify** no remaining "-default" tokens
2. **Test** that all references work
3. **Document** the new naming conventions

---

## 📊 **Impact Summary**

- **Total tokens to fix**: 88
- **Color tokens**: 67 (76%)
- **Icon tokens**: 16 (18%)
- **Layout tokens**: 4 (5%)
- **Corner radius tokens**: 4 (5%)

**This is a significant refactoring effort that will greatly improve token clarity!**
