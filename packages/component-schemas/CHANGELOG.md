# @adobe/spectrum-component-api-schemas

## 5.0.0

### Major Changes

- [#614](https://github.com/adobe/spectrum-tokens/pull/614) [`a772572`](https://github.com/adobe/spectrum-tokens/commit/a772572de88c54d279c20d7148f6ac91eb941d2a) Thanks [@AmunMRa](https://github.com/AmunMRa)! - # Component Schemas Changed (9 added, 0 deleted, 3 updated)

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

## 4.0.0

### Major Changes

- [#613](https://github.com/adobe/spectrum-tokens/pull/613) [`433efdd`](https://github.com/adobe/spectrum-tokens/commit/433efdd18f9b0842ae55acac3cd0fbc1e5e5db58) Thanks [@AmunMRa](https://github.com/AmunMRa)! - feat(component-schemas): add 10 new components with breaking changes to existing schemas

  ## Component Schemas Changed (10 added, 0 deleted, 17 updated)

  **Original Branch:** `main`

  **New Branch:** `draft-schema-updates`

  ### 🚨 Breaking Changes Detected

  This PR introduces **7 breaking change(s)** to component schemas. Please review carefully and ensure proper versioning.

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

  **menu**
  - Updated: `container` - removed `default: null`
  - Updated: `selectionMode` - removed `default: null` and added `"no selection"` to enum

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

## 3.0.0

### Major Changes

- [#610](https://github.com/adobe/spectrum-tokens/pull/610) [`13d9202`](https://github.com/adobe/spectrum-tokens/commit/13d920273c02c78d3748522de6a7c7ee39b39814) Thanks [@GarthDB](https://github.com/GarthDB)! - Component schema improvements for Batch 1 components

  Quality control pass on the Design API table for v0, ensuring schema consistency and completeness across S2 components.

  ## Component Schemas Changed (0 added, 0 deleted, 11 updated)

  **Original Branch:** `main`
  **New Branch:** `component-schema-batch1-fixes`

  ### 🚨 Breaking Changes Detected (5)

  This release introduces **5 breaking change(s)** to component schemas. Please review carefully and ensure proper versioning.

  <details open><summary><strong>💥 Breaking Updates</strong></summary>

  **popover**
  - Added: `hideTip` (boolean, default: false) - replaces removed `showTip`

  **rating**
  - Added: `value.minimum` (0), `value.maximum` (5), `value.multipleOf` (0.5)
  - Updated: `value.description` - "From 0 to 5, can be a decimal to represent half stars"

  **select-box**
  - Added: `hideIllustration` (boolean, default: false) - replaces removed `showIllustration`
  - Added: `isDisabled` (boolean, default: false)
  - Added: `multiple` (boolean, default: false) - "Set to true to allow multiple selections"
  - Updated: `orientation.default` changed to "vertical"

  **status-light**
  - Added: Colors to `variant.enum`: "gray", "red", "orange", "green", "cyan"
  - Added: `required` - ["label"] - label is now required
  - Removed: `isDisabled` property

  **tooltip**
  - Removed: "positive" from `variant.enum`
  - Updated: `hasIcon.description` - "If the neutral variant, there is never an icon"

  </details>

  ### ✅ Non-Breaking Updates (6)

  <details><summary><strong>🔄 Compatible Changes</strong></summary>

  **help-text**
  - Added: "negative" to `variant.enum`
  - Added: `isDisabled.description` - "Help text cannot be both disabled and negative variant"

  **meter**
  - Added: `hideLabel` (boolean, default: false)

  **progress-bar**
  - Added: `staticColor` (string, enum: ["white"]) - "Static color can only be white, otherwise it is default"
  - Added: `labelPosition` (string, enum: ["top", "side"], default: "top")
  - Added: `hideLabel` (boolean, default: false)

  **search-field**
  - Added: `hideLabel` (boolean, default: false)
  - Added: `icon` ($ref: workflow-icon.json) - "Icon must be present if the label is not defined"

  **text-area**
  - Added: `hideLabel` (boolean, default: false)

  **text-field**
  - Added: `hideLabel` (boolean, default: false)

  </details>

## 2.0.0

### Major Changes

- [#581](https://github.com/adobe/spectrum-tokens/pull/581) [`163fe7c`](https://github.com/adobe/spectrum-tokens/commit/163fe7c13bb00c639d202195a398126b6c25b58f) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(component-schemas): add S2 Batch 2 components with breaking changes
  - Add 6 new component schemas (coach-indicator, in-field-progress-button, etc.)
  - Update avatar, badge, and checkbox components with breaking changes
  - Expand size options and add new interaction states
  - Major version bump required due to breaking schema changes

## 1.0.2

### Patch Changes

- [#545](https://github.com/adobe/spectrum-tokens/pull/545) [`ebc79f6`](https://github.com/adobe/spectrum-tokens/commit/ebc79f6f91bce28a64cddfc2cc5548ddcf30389d) Thanks [@GarthDB](https://github.com/GarthDB)! - Fixed a typo where meter had `valueLable` instead of `valueLabel`.

## 1.0.1

### Patch Changes

- [#523](https://github.com/adobe/spectrum-tokens/pull/523) [`9c5a2ac`](https://github.com/adobe/spectrum-tokens/commit/9c5a2ac5fccb29b6f106396b21d91aab949043d4) Thanks [@GarthDB](https://github.com/GarthDB)! - S2 components batch 1 (part 2)

  ## Changes

  ### Properties added
  - component: select-box
    - `body`

  ### Properties updated
  - component: text-area
    - `errorMessage`
      - removed: `"default": null`

## 1.0.0

### Major Changes

- [#520](https://github.com/adobe/spectrum-tokens/pull/520) [`2964807`](https://github.com/adobe/spectrum-tokens/commit/2964807641908e40820bea0556b3b0542503223b) Thanks [@GarthDB](https://github.com/GarthDB) and [@AmunMRa](https://github.com/AmunMRa)! - S2 components batch 1

  ## Changes

  ### Properties Added
  - component: search-field
    - `helpText`
    - `placeholder`
    - `state`:
      - `down`
  - component: status-light
    - `variant`
      - `seafoam`
      - `pink`
      - `turquoise`
      - `cinnamon`
      - `brown`
      - `silver`
  - component: text-area
    - `helpText`
  - component: text-field
    - `helpText`

  ### Properties removed
  - component: search-field
    - `isQuiet`
  - component: text-area
    - `isQuiet`
    - `isReadOnly`
  - component: text-field
    - `isQuiet`
    - `isReadOnly`

  ### Properties updated
  - component: meter
    - `size`:
      - `enum`: `["small", "large"]` -> `["s", "m", "l", "xl"]`
      - `default`: `large` -> `m`
  - component: popover
    - `showTip`:
      - `default`: `false` -> `true`
    - `placement`:
      - `default`: `bottom` -> `top`
    - `offset`:
      - `default`: `6` -> `8`

  ### New Component
  - select-box

## 0.0.0

### Minor Changes

- [#353](https://github.com/adobe/spectrum-tokens/pull/353) [`71e674a`](https://github.com/adobe/spectrum-tokens/commit/71e674ad6baa630a900785ae21c9dcae93233b21) Thanks [@karstens](https://github.com/karstens)! - Release to latest branch

## 0.0.0-schema-20240821152525

### Patch Changes

- [#353](https://github.com/adobe/spectrum-tokens/pull/353) [`dc2d6c6`](https://github.com/adobe/spectrum-tokens/commit/dc2d6c6e12c1ea4fdc0d891b3fd50ea0b1697dd7) Thanks [@karstens](https://github.com/karstens)! - Making adjustments to bring the schema more in line with what was on the spectrum website.

## 0.0.0-schema-20240620220450

### Minor Changes

- [#353](https://github.com/adobe/spectrum-tokens/pull/353) [`64379eb`](https://github.com/adobe/spectrum-tokens/commit/64379ebeaf9402fe77ca1adfd020f42df60c60d9) Thanks [@karstens](https://github.com/karstens)! - Added schema for search-field and fixed some path bugs in testing

## 0.0.0-schema-20240618053842

### Minor Changes

- [#353](https://github.com/adobe/spectrum-tokens/pull/353) [`b5c1579`](https://github.com/adobe/spectrum-tokens/commit/b5c15792ec5f5e5c269bfa7bf58af3df42e648c1) Thanks [@karstens](https://github.com/karstens)! - Initial release

## 0.0.0-schema-20240614194147

### Patch Changes

- [#353](https://github.com/adobe/spectrum-tokens/pull/353) [`9805167`](https://github.com/adobe/spectrum-tokens/commit/980516791c0bef9e2f0bbeffe6515f103f3ad7a2) Thanks [@karstens](https://github.com/karstens)! - fixed some bugs

## 0.0.0-schema-20240613154750

### Patch Changes

- [#353](https://github.com/adobe/spectrum-tokens/pull/353) [`6ff5ad7`](https://github.com/adobe/spectrum-tokens/commit/6ff5ad7a75356f4b93d07a2818b357da19ce5b4b) Thanks [@karstens](https://github.com/karstens)! - Initial release
