---
"@adobe/spectrum-component-api-schemas": major
---

S2 components batch 1

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
