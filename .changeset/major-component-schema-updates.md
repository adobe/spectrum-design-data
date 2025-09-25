---
"@adobe/spectrum-component-schemas": major
---

feat(component-schemas): add 10 new components with breaking changes to existing schemas

## Component Schemas Changed (10 added, 0 deleted, 17 updated)

**Original Branch:** `main`

**New Branch:** `draft-schema-updates`

### 🚨 Breaking Changes Detected

This PR introduces **8 breaking change(s)** to component schemas. Please review carefully and ensure proper versioning.

<details open><summary><strong>📦 Added Components (10)</strong></summary>

- `accordion` - New component schema
- `avatar-group` - New component schema
- `color-handle` - New component schema
- `date-picker` - New component schema
- `drop-zone` - New component schema
- `number-field` - New component schema
- `segmented-control` - New component schema
- `step-list` - New component schema
- `tag-field` - New component schema
- `tag-group` - New component schema

</details>

<details open><summary><strong>💥 Breaking Updates ⚠️ BREAKING</strong></summary>

**checkbox-group**

- Removed: `isReadOnly` property

**combo-box**

- Added: `labelPosition`
- Removed: `isQuiet` property

**contextual-help**

- Added: `href` (string) - "Optional URL within contextual help content like a 'Learn more' link."
- Removed: `popoverOffset` property
- Updated: `popoverOffset` - default changed to "8"

**menu**

- Added: `selectionMode`
- Removed: `container` property
- Removed: `selectionMode` property

**radio-button**

- Added: `label` - "The text displayed next to a radio button."
- Removed: `label` property
- Updated: `label`

**radio-group**

- Removed: `isReadOnly` property

**tabs**

- Added: `items` (array) - "An array of tab items."
- Removed: `size` property
- Removed: `density` property
- Removed: `isFluid` property
- Removed: `isQuiet` property
- Removed: `isEmphasized` property
- Removed: `alignment` property
- Removed: `selectedItem` property
- Removed: `keyboardActivation` property
- Updated: `orientation` - default changed to "horizontal"

**tree-view**

- Added: `isEmphasized` (boolean)
- Removed: `emphasized` property

</details>

<details><summary><strong>🔄 Non-Breaking Updates</strong></summary>

**breadcrumbs**

- Added: `isMultiline` (boolean) - "If true, the breadcrumb items will wrap to multiple lines."
- Added: `size` (string, default: m) - "Controls the overall size of the breadcrumb component."
- Added: `items` (array) - "An array of breadcrumb items."
- Added: `separator` (string, default: chevron) - "The separator icon used between breadcrumb items."
- Added: `isTruncated` (boolean) - "If true, the breadcrumb item is truncated and displayed as icon only."
- Added: `sizeOverride` (string) - "Overrides the size of the breadcrumb items when isMultiline is true."

**button-group**

- Added: `overflowMode` (string, default: wrap)

**color-slider**

- Added: `channel` (string, default: hue) - "Which channel of the color this slider controls. Use 'alpha' for opacity."
- Updated: `value` - "Number (from minValue to maxValue)."

**divider**

- Updated: `size` - default changed to "s"

**in-line-alert**

- Added: `style` (string, default: outline) - "The visual style of the alert."
- Added: `href` (string) - "Optional URL within in-line alert content like a 'Learn more' link."
- Added: `heading` (string) - "Optional heading text displayed at the top of the alert."
- Added: `actionLabel` (string) - "If undefined, this button does not appear."
- Updated: `variant`

**slider**

- Added: `isRange` (boolean) - "If true, the slider will allow selection of a range of values by displaying two handles."

**swatch-group**

- Added: `cornerRadius` (string, default: none) - "Determines the corner radius of each swatch in the group. Partial refers to corner-radius-75."

**swatch**

- Added: `cornerRounding` - "Determines the corner radius of the swatch. Partial refers to corner-radius-75."
- Updated: `cornerRounding` - default changed to "none"

**text-field**

- Updated: `isError` - "If there is an error, this property overrides show valid icon."

</details>
