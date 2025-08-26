---
"@adobe/spectrum-component-api-schemas": major
---

**BREAKING CHANGE**: Update component schemas for S2 Batch 2 with breaking changes

This update introduces significant changes to existing component schemas and adds 6 new component schemas. **⚠️ This introduces 3 breaking changes to existing components.**

## Summary

| Change Type          | Count |
| -------------------- | ----- |
| Added Components     | 6     |
| Updated Components   | 3     |
| **Breaking Changes** | **3** |
| Non-Breaking Changes | 6     |

## 📦 Added Components

- **`coach-indicator`** - New component for onboarding and feature discovery with cornerRounding (11 radius options) and staticColor properties
- **`in-field-progress-button`** - New component for interactive controls within form fields with size, state, style, and isQuiet properties
- **`in-field-progress-circle`** - New component for loading states within form fields with size and staticColor properties
- **`opacity-checkerboard`** - New component for transparency backgrounds in color swatches with verticalSize and horizontalSize properties
- **`radio-button`** - New component for mutually exclusive option selection with state, isSelected, isEmphasized, and label properties
- **`thumbnail`** - New component for image and content previews with 12 size options (50-1000) and state properties

## 💥 Breaking Changes ⚠️

### Avatar Component

- **BREAKING**: Remove "hover" from state enum (only "default", "down", "keyboard focus" remain)
- **BREAKING**: Replace image enum: ["text", "image"] → ["user image", "gradient image", etc.]
- **BREAKING**: Change size default from 100 to 500
- **BREAKING**: Change image default from "image" to "user image"
- **Non-breaking**: Add larger size options (800-1500) and showStroke boolean property

### Badge Component

- **BREAKING**: Expand variant colors (15 new colors: accent, notice, gray, red, orange, etc.)
- **Non-breaking**: Add new style property with options: bold, subtle, outline

### Checkbox Component

- **BREAKING**: Remove isReadOnly property completely

## Migration Guide

**Avatar Component**:

- Update state handling to remove "hover" state references
- Map old image enum values: "image" → "user image", "text" → check new enum options
- Update default size handling from 100 to 500
- Add showStroke boolean handling for stroke display control

**Badge Component**:

- Review variant color usage for new expanded options
- Implement style property handling (bold, subtle, outline)

**Checkbox Component**:

- Remove any isReadOnly property usage and implement alternative readonly patterns

## Component Schema Diff Report

Generated using `@adobe/spectrum-component-diff-generator`:

```
Added Components: 6
- coach-indicator: New component schema
- in-field-progress-button: New component schema
- in-field-progress-circle: New component schema
- opacity-checkerboard: New component schema
- radio-button: New component schema
- thumbnail: New component schema

Breaking Updates: 3
- avatar: Schema changes that break backward compatibility
- badge: Schema changes that break backward compatibility
- checkbox: Schema changes that break backward compatibility
```

## Impact Assessment

This major version bump affects all consumers of `@adobe/spectrum-component-api-schemas`. Implementation teams (Spectrum CSS, React Spectrum, Web Components, iOS, Qt, Drover) will need to:

1. Update component implementations to handle breaking schema changes
2. Add support for 6 new component schemas
3. Update tests and documentation for modified components
4. Ensure proper handling of new size ranges and property options
