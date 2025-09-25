---
"@adobe/spectrum-component-api-schemas": major
---

# Component Schemas Changed (9 added, 0 deleted, 3 updated)

**Original Branch:** `main`

**New Branch:** `feat-batch4-schema-updates`

## 🚨 Breaking Changes Detected

This PR introduces **2 breaking change(s)** to component schemas. Please review carefully and ensure proper versioning.

### 📦 Added Components (9)

- `calendar` - New component schema
- `cards` - New component schema
- `coach-mark` - New component schema
- `illustrated-message` - New component schema
- `list-view` - New component schema
- `standard-dialog` - New component schema
- `standard-panel` - New component schema
- `table` - New component schema
- `takeover-dialog` - New component schema

### 💥 Breaking Updates ⚠️ BREAKING

**picker**

- Removed: `isReadOnly` property

**side-navigation**

- Added: `items` (array) - "The list of navigation items."
- Added: `selectionMode` (string, default: single) - "How selection is handled for items."
- Added: `required` - ["items"]

### 🔄 Non-Breaking Updates

**alert-banner**

- Added: `variant`
