# @adobe/spectrum-tokens

## 13.0.0-beta.0

### Major Changes

- 4f518be: Merged Spectrum and Express system set data. This is part of the Spectrum 2 work that will no longer have two separate systems.

  The merge takes the keeps the `value` and `uuid` from `spectrum`.

  ## Token Diff

  <details><summary><strong>Tokens values updated (102):</strong></summary>

  - `accent-background-color-default`
  - `accent-background-color-down`
  - `accent-background-color-hover`
  - `accent-background-color-key-focus`
  - `accent-color-100`
  - `accent-color-1000`
  - `accent-color-1100`
  - `accent-color-1200`
  - `accent-color-1300`
  - `accent-color-1400`
  - `accent-color-200`
  - `accent-color-300`
  - `accent-color-400`
  - `accent-color-500`
  - `accent-color-600`
  - `accent-color-700`
  - `accent-color-800`
  - `accent-color-900`
  - `accent-content-color-default`
  - `accent-content-color-down`
  - `accent-content-color-hover`
  - `accent-content-color-key-focus`
  - `accent-content-color-selected`
  - `accent-visual-color`
  - `border-width-100`
  - `checkbox-control-size-extra-large`
  - `checkbox-control-size-large`
  - `checkbox-control-size-medium`
  - `checkbox-control-size-small`
  - `checkbox-top-to-control-extra-large`
  - `checkbox-top-to-control-large`
  - `checkbox-top-to-control-medium`
  - `checkbox-top-to-control-small`
  - `color-area-border-rounding`
  - `color-area-border-width`
  - `color-handle-drop-shadow-color`
  - `corner-radius-100`
  - `corner-radius-200`
  - `corner-radius-75`
  - `drop-shadow-blur`
  - `drop-shadow-x`
  - `drop-shadow-y`
  - `drop-zone-background-color`
  - `heading-cjk-font-weight`
  - `heading-sans-serif-emphasized-font-weight`
  - `heading-sans-serif-font-weight`
  - `heading-serif-emphasized-font-weight`
  - `heading-serif-font-weight`
  - `in-field-button-edge-to-fill`
  - `in-field-button-fill-stacked-inner-border-rounding`
  - `in-field-button-inner-edge-to-disclosure-icon-stacked-extra-large`
  - `in-field-button-inner-edge-to-disclosure-icon-stacked-large`
  - `in-field-button-inner-edge-to-disclosure-icon-stacked-medium`
  - `in-field-button-inner-edge-to-disclosure-icon-stacked-small`
  - `in-field-button-outer-edge-to-disclosure-icon-stacked-extra-large`
  - `in-field-button-outer-edge-to-disclosure-icon-stacked-large`
  - `in-field-button-outer-edge-to-disclosure-icon-stacked-medium`
  - `in-field-button-stacked-inner-edge-to-fill`
  - `neutral-background-color-selected-default`
  - `neutral-background-color-selected-down`
  - `neutral-background-color-selected-hover`
  - `neutral-background-color-selected-key-focus`
  - `picker-border-width`
  - `radio-button-control-size-extra-large`
  - `radio-button-control-size-large`
  - `radio-button-control-size-medium`
  - `radio-button-control-size-small`
  - `radio-button-top-to-control-extra-large`
  - `radio-button-top-to-control-large`
  - `radio-button-top-to-control-medium`
  - `radio-button-top-to-control-small`
  - `slider-bottom-to-handle-extra-large`
  - `slider-bottom-to-handle-large`
  - `slider-bottom-to-handle-medium`
  - `slider-bottom-to-handle-small`
  - `slider-control-height-extra-large`
  - `slider-control-height-large`
  - `slider-control-height-medium`
  - `slider-control-height-small`
  - `slider-handle-border-width-down-extra-large`
  - `slider-handle-border-width-down-large`
  - `slider-handle-border-width-down-medium`
  - `slider-handle-border-width-down-small`
  - `slider-handle-gap`
  - `slider-handle-size-extra-large`
  - `slider-handle-size-large`
  - `slider-handle-size-medium`
  - `slider-handle-size-small`
  - `slider-track-thickness`
  - `switch-control-height-extra-large`
  - `switch-control-height-large`
  - `switch-control-height-medium`
  - `switch-control-height-small`
  - `switch-control-width-extra-large`
  - `switch-control-width-large`
  - `switch-control-width-medium`
  - `switch-control-width-small`
  - `switch-top-to-control-extra-large`
  - `switch-top-to-control-large`
  - `switch-top-to-control-medium`
  - `switch-top-to-control-small`
  - `table-selected-row-background-color-non-emphasized`

  </details>

## 12.19.1

### Patch Changes

- d9a6b7b: Updated manifest.json file

## 12.19.0

### Minor Changes

- 0c716de: Added icon tokens

  ### Token Diff

  _Tokens added (6):_

  - `icon-color-blue-primary-default`
  - `icon-color-green-primary-default`
  - `icon-color-inverse`
  - `icon-color-primary-default`
  - `icon-color-red-primary-default`
  - `icon-color-yellow-primary-default`

## 12.18.1

### Patch Changes

- 6f5443e: Added missing `wireframe` values for 2 color tokens

  ## Token Diff

  _Tokens update (2):_

  - `opacity-checkerboard-square-dark`
  - `overlay-opacity`

## 12.18.0

### Minor Changes

- bb89361: Update meter token from meter-default-width to meter-width.

  ### Design motivation

  We try to avoid "default" in the name (unless it's the state) because it's a word that implies that it's relative to something else that may not be named, which could get confusing. So meter-width I think for the name, and then just add a note in the specs.

  ### Token diff

  _Renamed token:_

  - `meter-default-width` -> `meter-width`

  _Token added for deprecation and rename:_

  - `meter-default-width`

## 12.17.0

### Minor Changes

- 687f6c3: Updated coach-mark tokens

#### Token Diff

_Tokens added (3):_

- `coach-mark-maximum-width`
- `coach-mark-media-height`
- `coach-mark-width`

_Token values updated (4):_

- `coach-mark-minimum-width`: `mobile` from `208px` to `216px`
- `coach-mark-title-size`: added `desktop` value
- `coach-mark-body-size`: added `desktop` value
- `coach-mark-pagination-body-size`: added `desktop` value

## 12.16.0

### Minor Changes

- 25dc20d: Add new menu-item token for section dividers

#### Token Diff

_Tokens added (1):_

- `menu-item-section-divider-height`

## 12.15.0

### Minor Changes

- fc12f6d: Added side-navigation token

#### Token Diff

_Tokens added (1):_

- `side-navigation-bottom-to-text`

## 12.14.0

### Minor Changes

- cb9e3bf: Added in-field button tokens

  ## Token Diff

  _Tokens added (19):_

  - `in-field-button-edge-to-disclosure-icon-stacked-extra-large`
  - `in-field-button-edge-to-disclosure-icon-stacked-large`
  - `in-field-button-edge-to-disclosure-icon-stacked-medium`
  - `in-field-button-edge-to-disclosure-icon-stacked-small`
  - `in-field-button-edge-to-fill`
  - `in-field-button-fill-stacked-inner-border-rounding`
  - `in-field-button-inner-edge-to-disclosure-icon-stacked-extra-large`
  - `in-field-button-inner-edge-to-disclosure-icon-stacked-large`
  - `in-field-button-inner-edge-to-disclosure-icon-stacked-medium`
  - `in-field-button-inner-edge-to-disclosure-icon-stacked-small`
  - `in-field-button-outer-edge-to-disclosure-icon-stacked-extra-large`
  - `in-field-button-outer-edge-to-disclosure-icon-stacked-large`
  - `in-field-button-outer-edge-to-disclosure-icon-stacked-medium`
  - `in-field-button-outer-edge-to-disclosure-icon-stacked-small`
  - `in-field-button-stacked-inner-edge-to-fill`
  - `in-field-button-width-stacked-extra-large`
  - `in-field-button-width-stacked-large`
  - `in-field-button-width-stacked-medium`
  - `in-field-button-width-stacked-small`

## 12.13.1

### Patch Changes

- 02459bf: Migrate dependencies to devDependencies as they are not needed downstream to leverage the package.

## 12.13.0

### Minor Changes

- d740d2c: added table tokens

  ## Token diff

  _Tokens added (88):_

  - `table-border-divider-width`
  - `table-checkbox-to-text`
  - `table-column-header-row-bottom-to-text-extra-large`
  - `table-column-header-row-bottom-to-text-large`
  - `table-column-header-row-bottom-to-text-medium`
  - `table-column-header-row-bottom-to-text-small`
  - `table-column-header-row-top-to-text-extra-large`
  - `table-column-header-row-top-to-text-large`
  - `table-column-header-row-top-to-text-medium`
  - `table-column-header-row-top-to-text-small`
  - `table-edge-to-content`
  - `table-header-row-checkbox-to-top-extra-large`
  - `table-header-row-checkbox-to-top-large`
  - `table-header-row-checkbox-to-top-medium`
  - `table-header-row-checkbox-to-top-small`
  - `table-row-bottom-to-text-extra-large-compact`
  - `table-row-bottom-to-text-extra-large-regular`
  - `table-row-bottom-to-text-extra-large-spacious`
  - `table-row-bottom-to-text-large-compact`
  - `table-row-bottom-to-text-large-regular`
  - `table-row-bottom-to-text-large-spacious`
  - `table-row-bottom-to-text-medium-compact`
  - `table-row-bottom-to-text-medium-regular`
  - `table-row-bottom-to-text-medium-spacious`
  - `table-row-bottom-to-text-small-compact`
  - `table-row-bottom-to-text-small-regular`
  - `table-row-bottom-to-text-small-spacious`
  - `table-row-checkbox-to-top-extra-large-compact`
  - `table-row-checkbox-to-top-extra-large-regular`
  - `table-row-checkbox-to-top-extra-large-spacious`
  - `table-row-checkbox-to-top-large-compact`
  - `table-row-checkbox-to-top-large-regular`
  - `table-row-checkbox-to-top-large-spacious`
  - `table-row-checkbox-to-top-medium-compact`
  - `table-row-checkbox-to-top-medium-regular`
  - `table-row-checkbox-to-top-medium-spacious`
  - `table-row-checkbox-to-top-small-compact`
  - `table-row-checkbox-to-top-small-regular`
  - `table-row-checkbox-to-top-small-spacious`
  - `table-row-down-opacity`
  - `table-row-height-extra-large-compact`
  - `table-row-height-extra-large-regular`
  - `table-row-height-extra-large-spacious`
  - `table-row-height-large-compact`
  - `table-row-height-large-regular`
  - `table-row-height-large-spacious`
  - `table-row-height-medium-compact`
  - `table-row-height-medium-regular`
  - `table-row-height-medium-spacious`
  - `table-row-height-small-compact`
  - `table-row-height-small-regular`
  - `table-row-height-small-spacious`
  - `table-row-hover-color`
  - `table-row-hover-opacity`
  - `table-row-top-to-text-extra-large-compact`
  - `table-row-top-to-text-extra-large-regular`
  - `table-row-top-to-text-extra-large-spacious`
  - `table-row-top-to-text-large-compact`
  - `table-row-top-to-text-large-regular`
  - `table-row-top-to-text-large-spacious`
  - `table-row-top-to-text-medium-compact`
  - `table-row-top-to-text-medium-regular`
  - `table-row-top-to-text-medium-spacious`
  - `table-row-top-to-text-small-compact`
  - `table-row-top-to-text-small-regular`
  - `table-row-top-to-text-small-spacious`
  - `table-section-header-row-height-extra-large`
  - `table-section-header-row-height-large`
  - `table-section-header-row-height-medium`
  - `table-section-header-row-height-small`
  - `table-selected-row-background-color`
  - `table-selected-row-background-color-non-emphasized`
  - `table-selected-row-background-opacity`
  - `table-selected-row-background-opacity-hover`
  - `table-selected-row-background-opacity-non-emphasized`
  - `table-selected-row-background-opacity-non-emphasized-hover`
  - `table-thumbnail-to-top-minimum-extra-large-compact`
  - `table-thumbnail-to-top-minimum-extra-large-regular`
  - `table-thumbnail-to-top-minimum-extra-large-spacious`
  - `table-thumbnail-to-top-minimum-large-compact`
  - `table-thumbnail-to-top-minimum-large-regular`
  - `table-thumbnail-to-top-minimum-large-spacious`
  - `table-thumbnail-to-top-minimum-medium-compact`
  - `table-thumbnail-to-top-minimum-medium-regular`
  - `table-thumbnail-to-top-minimum-medium-spacious`
  - `table-thumbnail-to-top-minimum-small-compact`
  - `table-thumbnail-to-top-minimum-small-regular`
  - `table-thumbnail-to-top-minimum-small-spacious`

## 12.12.1

### Patch Changes

- 6365597: Added IDs to previously publish tab tokens

  ## Token Diff

  _Tokens updated (51):_

  - `accent-content-color-selected`
  - `neutral-subdued-content-color-selected`
  - `tab-item-bottom-to-text-compact-extra-large`
  - `tab-item-bottom-to-text-compact-large`
  - `tab-item-bottom-to-text-compact-medium`
  - `tab-item-bottom-to-text-compact-small`
  - `tab-item-bottom-to-text-extra-large`
  - `tab-item-bottom-to-text-large`
  - `tab-item-bottom-to-text-medium`
  - `tab-item-bottom-to-text-small`
  - `tab-item-compact-height-extra-large`
  - `tab-item-compact-height-large`
  - `tab-item-compact-height-medium`
  - `tab-item-compact-height-small`
  - `tab-item-focus-indicator-gap-extra-large`
  - `tab-item-focus-indicator-gap-large`
  - `tab-item-focus-indicator-gap-medium`
  - `tab-item-focus-indicator-gap-small`
  - `tab-item-height-extra-large`
  - `tab-item-height-large`
  - `tab-item-height-medium`
  - `tab-item-height-small`
  - `tab-item-start-to-edge-extra-large`
  - `tab-item-start-to-edge-large`
  - `tab-item-start-to-edge-medium`
  - `tab-item-start-to-edge-quiet`
  - `tab-item-start-to-edge-small`
  - `tab-item-to-tab-item-horizontal-extra-large`
  - `tab-item-to-tab-item-horizontal-large`
  - `tab-item-to-tab-item-horizontal-medium`
  - `tab-item-to-tab-item-horizontal-small`
  - `tab-item-to-tab-item-vertical-extra-large`
  - `tab-item-to-tab-item-vertical-large`
  - `tab-item-to-tab-item-vertical-medium`
  - `tab-item-to-tab-item-vertical-small`
  - `tab-item-top-to-text-compact-extra-large`
  - `tab-item-top-to-text-compact-large`
  - `tab-item-top-to-text-compact-medium`
  - `tab-item-top-to-text-compact-small`
  - `tab-item-top-to-text-extra-large`
  - `tab-item-top-to-text-large`
  - `tab-item-top-to-text-medium`
  - `tab-item-top-to-text-small`
  - `tab-item-top-to-workflow-icon-compact-extra-large`
  - `tab-item-top-to-workflow-icon-compact-large`
  - `tab-item-top-to-workflow-icon-compact-medium`
  - `tab-item-top-to-workflow-icon-compact-small`
  - `tab-item-top-to-workflow-icon-extra-large`
  - `tab-item-top-to-workflow-icon-large`
  - `tab-item-top-to-workflow-icon-medium`
  - `tab-item-top-to-workflow-icon-small`

## 12.12.0

### Minor Changes

- ba02b18: Added tokens for the tabs component

  ## Token diff

  _Tokens added (51):_

  - `accent-content-color-selected`
  - `neutral-subdued-content-color-selected`
  - `tab-item-bottom-to-text-compact-extra-large`
  - `tab-item-bottom-to-text-compact-large`
  - `tab-item-bottom-to-text-compact-medium`
  - `tab-item-bottom-to-text-compact-small`
  - `tab-item-bottom-to-text-extra-large`
  - `tab-item-bottom-to-text-large`
  - `tab-item-bottom-to-text-medium`
  - `tab-item-bottom-to-text-small`
  - `tab-item-compact-height-extra-large`
  - `tab-item-compact-height-large`
  - `tab-item-compact-height-medium`
  - `tab-item-compact-height-small`
  - `tab-item-focus-indicator-gap-extra-large`
  - `tab-item-focus-indicator-gap-large`
  - `tab-item-focus-indicator-gap-medium`
  - `tab-item-focus-indicator-gap-small`
  - `tab-item-height-extra-large`
  - `tab-item-height-large`
  - `tab-item-height-medium`
  - `tab-item-height-small`
  - `tab-item-start-to-edge-extra-large`
  - `tab-item-start-to-edge-large`
  - `tab-item-start-to-edge-medium`
  - `tab-item-start-to-edge-quiet`
  - `tab-item-start-to-edge-small`
  - `tab-item-to-tab-item-horizontal-extra-large`
  - `tab-item-to-tab-item-horizontal-large`
  - `tab-item-to-tab-item-horizontal-medium`
  - `tab-item-to-tab-item-horizontal-small`
  - `tab-item-to-tab-item-vertical-extra-large`
  - `tab-item-to-tab-item-vertical-large`
  - `tab-item-to-tab-item-vertical-medium`
  - `tab-item-to-tab-item-vertical-small`
  - `tab-item-top-to-text-compact-extra-large`
  - `tab-item-top-to-text-compact-large`
  - `tab-item-top-to-text-compact-medium`
  - `tab-item-top-to-text-compact-small`
  - `tab-item-top-to-text-extra-large`
  - `tab-item-top-to-text-large`
  - `tab-item-top-to-text-medium`
  - `tab-item-top-to-text-small`
  - `tab-item-top-to-workflow-icon-compact-extra-large`
  - `tab-item-top-to-workflow-icon-compact-large`
  - `tab-item-top-to-workflow-icon-compact-medium`
  - `tab-item-top-to-workflow-icon-compact-small`
  - `tab-item-top-to-workflow-icon-extra-large`
  - `tab-item-top-to-workflow-icon-large`
  - `tab-item-top-to-workflow-icon-medium`
  - `tab-item-top-to-workflow-icon-small`

## 12.11.0

### Minor Changes

- 1a57f08: Fixed typo with `picker-end-edge-to-disclosure-icon-quiet` by adding a new token and deprecating `picker-end-edge-to-disclousure-icon-quiet`.

  ## Token Diff

  _Token added (1):_

  - `picker-end-edge-to-disclosure-icon-quiet`

  _Newly deprecated token (1):_

  - `picker-end-edge-to-disclousure-icon-quiet`

## 12.10.0

### Minor Changes

- 0829c5d: Added UUIDs to each token

  ## Token Diff

  _Modified Tokens (1154)_

  Every token has a `uuid` property added to them.

## 12.9.1

### Patch Changes

- cace8d8: Fixed component name typo

  ## Token Diff

  The following tokens have update `component` metadata property (all have been set to `coach-mark`):

  - `coach-mark-minimum-width`
  - `coach-mark-edge-to-content`
  - `coach-mark-pagination-text-to-bottom-edge`
  - `coach-mark-width`
  - `coach-mark-media-minimum-height`
  - `coach-mark-media-height`
  - `coach-mark-title-size`
  - `coach-mark-body-size`
  - `coach-mark-pagination-body-size`

## 12.9.0

### Minor Changes

- fe7a002: Fixed typo by adding correct token (`floating-action-button-drop-shadow-color`) and deprecating incorrect token name (`floating-action-button-shadow-color`).

  ## Token Diff

  _Token added (1):_

  - `floating-action-button-drop-shadow-color`

  _Newly deprecated token (1):_

  - `floating-action-button-shadow-color` (use `floating-action-button-drop-shadow-color` instead)

## 12.8.0

### Minor Changes

- d639b4b: Updated color-handle-inner-border-opacity to remove express specific value

  ## Token Diff

  _Token values updated (2):_

  - `color-handle-inner-border-opacity` (to remove express specific values)
  - `color-handle-outer-border-opacity` (to remove express specific values)

## 12.7.0

### Minor Changes

- 625cb7f: Removed express specific token data for color handle

### Token Diff

_Tokens values updated (4):_

- `color-loupe-bottom-to-color-handle` (removed express specific token data)
- `color-loupe-height` (removed express specific token data)
- `color-loupe-inner-border-width` (removed express specific token data)
- `color-loupe-width` (removed express specific token data)

## 12.6.0

### Minor Changes

- ee5bfd8: Adding a couple tokens to floating action button that should have been included earlier.
- 853d8c3: Removed express specific token data for color loupe and color handle
- c9e76ab: Contextual help did not have any type specific tokens when it was initially defined.

### Token Diff

_Tokens added (4):_

- `floating-action-button-drop-shadow-y`
- `floating-action-button-shadow-color`
- `contextual-help-body-size`
- `contextual-help-title-size`

_Tokens values updated (7):_

- `color-handle-drop-shadow-blur`
- `color-handle-drop-shadow-x`
- `color-handle-drop-shadow-y`
- `color-handle-outer-border-opacity`
- `color-handle-outer-border-width`
- `color-handle-size`
- `color-handle-size-key-focus`

_Newly deprecated tokens (1):_

- `color-handle-drop-shadow-color`

## 12.5.0

### Minor Changes

- c1eaeee: Added new tokens for slider. Deprecated old slider tokens.

## 12.4.0

### Minor Changes

- 5406a24: Added `side-navigation` tokens.

## 12.3.0

### Minor Changes

- fc919d2: Added tray token `tray-top-to-content-area`
