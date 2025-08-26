# @adobe/spectrum-component-api-schemas

## 2.0.0

### Major Changes

- [`afa3e42`](https://github.com/adobe/spectrum-tokens/commit/afa3e42b695571b44cec5ca79974f74361d22851) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(component-schemas): add S2 Batch 2 components with breaking changes
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
