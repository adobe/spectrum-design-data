# Round-Trip Conversion Analysis

## Executive Summary

Using the repo's **Component Schema Diff Generator** tool, we analyzed round-trip conversion (Schema → Plugin → Schema) for all 80 Spectrum component schemas.

### Results

```
✅ Perfect round-trip:           41/80 components (51.3%)
✅ Non-breaking differences:     36/80 components (45.0%)
❌ Breaking differences:          3/80 components  (3.8%)
```

## Non-Breaking Differences (36 components)

**Issue:** JSON property key ordering\
**Affected:** 36 components\
**Severity:** Cosmetic only

### Example

```json
// Original
{ "type": "string", "default": "fill", "enum": ["fill", "outline"] }

// Round-trip  
{ "type": "string", "enum": ["fill", "outline"], "default": "fill" }
```

**Impact:** None - JSON property order is not specified and doesn't affect functionality.

## Breaking Differences (3 components)

### 1. Missing `examples` Field

**Affected:** action-bar, action-group\
**Count:** 2 schemas

**Lost Data:**

```json
"examples": [
  { "isEmphasized": true },
  { "isEmphasized": false },
  {}
]
```

**Reason:** The converter doesn't preserve the top-level `examples` field.

### 2. Missing Advanced JSON Schema Features

**Affected:** cards\
**Count:** 1 schema

**Lost Data:**

* `definitions`: Reusable schema definitions (baseCard definition with 8 properties)
* `oneOf`: Schema composition for 6 card variants (asset, collection, flex, gallery, horizontal, product)

**Original Structure:**

```json
{
  "definitions": {
    "baseCard": { /* shared properties */ }
  },
  "oneOf": [
    { "allOf": [{ "$ref": "#/definitions/baseCard" }, { /* variant-specific */ }] },
    // ... 5 more variants
  ]
}
```

**Converted To:**

```json
{
  "properties": {
    "variant": { "type": "string", "enum": ["asset", "collection", ...] }
  }
}
```

**Reason:** The converter doesn't support:

* JSON Schema `definitions` (reusable schemas)
* JSON Schema `oneOf`/`allOf` (schema composition)
* JSON Schema `$ref` (internal references)

## Summary by Feature Usage

| Feature          | Schemas Using It | Converter Support | Impact             |
| ---------------- | ---------------- | ----------------- | ------------------ |
| Basic properties | 80/80 (100%)     | ✅ Full            | None               |
| Enums            | 74/80 (92.5%)    | ✅ Full            | None               |
| Defaults         | 71/80 (88.8%)    | ✅ Full            | None               |
| Required fields  | 67/80 (83.8%)    | ✅ Full            | None               |
| `examples`       | 2/80 (2.5%)      | ❌ Lost            | Documentation only |
| `definitions`    | 1/80 (1.3%)      | ❌ Lost            | Structural         |
| `oneOf`          | 1/80 (1.3%)      | ❌ Lost            | Structural         |

## Recommendations

### For the Figma Plugin

The converter is **production-ready** for 77/80 components (96.3%):

* ✅ All simple components work perfectly
* ✅ All enum-based components work perfectly
* ✅ Property ordering differences are cosmetic only

### Unsupported Components

**Do not use the plugin for:**

1. `action-bar` - loses examples
2. `action-group` - loses examples
3. `cards` - loses variant structure (major data loss)

### Future Enhancements

To support all 80 components, the converter would need to add:

1. **Preserve `examples` field** (easy fix)
   * Store in plugin meta or separate field
   * Restore on conversion back

2. **Support advanced JSON Schema** (complex)
   * `definitions` - reusable schema components
   * `oneOf`/`allOf`/`anyOf` - schema composition
   * `$ref` - internal and external references
   * This would require significant plugin UI changes

## Conclusion

The converter successfully handles **96.3% of component schemas** with:

* ✅ 100% data preservation for supported features
* ✅ 51.3% byte-for-byte identical round-trip
* ✅ 45.0% cosmetic-only differences
* ❌ 3.8% missing advanced JSON Schema features

For the Figma plugin's use case (authoring simple component option schemas), the converter is **fully functional** for the vast majority of components.
