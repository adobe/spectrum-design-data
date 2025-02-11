# @adobe/spectrum-tokens

## 12.28.0

### Minor Changes

- [#468](https://github.com/adobe/spectrum-tokens/pull/468) [`1b5b205`](https://github.com/adobe/spectrum-tokens/commit/1b5b20557d7c5d6c88209debe0d38b529679f039) Thanks [@larz0](https://github.com/larz0)! - Added static colors (for premium gradients) to light, dark, darkest, and wireframe themes.

  ## Design Motivation

  The Firefly team is looking to add these for usage, and the team agreed that it would be better to have these tokens available then for the team to create their own custom tokens.

  ## Token Diff

  _Tokens added (10):_

  - `static-blue-900`
  - `static-blue-1000`
  - `static-fuchsia-900`
  - `static-fuchsia-1000`
  - `static-indigo-900`
  - `static-indigo-1000`
  - `static-magenta-900`
  - `static-magenta-1000`
  - `static-red-900`
  - `static-red-1000`

## 12.27.0

### Minor Changes

- [#409](https://github.com/adobe/spectrum-tokens/pull/409) [`a61060a`](https://github.com/adobe/spectrum-tokens/commit/a61060a164a944907f236c8df7fcab31220cdd01) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - Token changes for CJK typography improvements.

  Updated S1 tokens - typography, foundations

  ## Design Motivation

  The S1 type token changes fix some minor issues with CJK font-sizing, font-weight, and removes the added letter-spacing (since we got feedback this was unnecessary and both latin and CJK characters look too spaced out with the current letter-spacing applied).

  ## Token Diff

  _Tokens added (13):_

  - `body-cjk-size-l`
  - `body-cjk-size-m`
  - `body-cjk-size-s`
  - `body-cjk-size-xl`
  - `body-cjk-size-xs`
  - `body-cjk-size-xxl`
  - `body-cjk-size-xxxl`
  - `detail-cjk-size-l`
  - `detail-cjk-size-m`
  - `detail-cjk-size-s`
  - `detail-cjk-size-xl`
  - `font-size-25`
  - `letter-spacing`

  _Token values updated (14):_

  - `body-cjk-strong-emphasized-font-weight`
  - `body-cjk-strong-font-weight`
  - `cjk-letter-spacing`
  - `detail-cjk-emphasized-font-weight`
  - `detail-cjk-strong-emphasized-font-weight`
  - `detail-cjk-strong-font-weight`
  - `drop-zone-cjk-title-size`
  - `heading-cjk-heavy-font-weight`
  - `heading-cjk-size-s`
  - `heading-cjk-size-xs`
  - `heading-cjk-size-xxl`
  - `heading-cjk-size-xxs`
  - `heading-cjk-size-xxxl`
  - `illustrated-message-cjk-title-size`

## 12.26.0

### Minor Changes

- [#345](https://github.com/adobe/spectrum-tokens/pull/345) [`fe4c707`](https://github.com/adobe/spectrum-tokens/commit/fe4c707c5ae2cc89efe6439dc775cddc94b706b3) Thanks [@GarthDB](https://github.com/GarthDB)! - Added UUIDs to the base of set tokens.

## 12.25.0

### Minor Changes

- [`413ef5a`](https://github.com/adobe/spectrum-tokens/commit/413ef5adad9083b7e133cc867e0436a879004ec8) Thanks [@GarthDB](https://github.com/GarthDB)! - Added `private` metadata to global tokens.

## 12.24.1

### Patch Changes

- 9361a58: Fixed misnamed accordion token.

  ## Token Diff

  _Tokens added (1):_

  - `accordion-top-to-text-spacious-small`

  _Newly deprecated token (1):_

  - `accordion-small-top-to-text-spacious`

## 12.24.0

### Minor Changes

- 4208725: The 14 tokens listed in the diff below had identical values between sets and so were merged to single values to simplify the data.

  ## Token Diff

  _Tokens values update (14):_

  - `accordion-disclosure-indicator-to-text`
  - `accordion-edge-to-disclosure-indicator`
  - `accordion-edge-to-text`
  - `accordion-focus-indicator-gap`
  - `accordion-top-to-text-compact-medium`
  - `accordion-top-to-text-compact-small`
  - `action-button-edge-to-hold-icon-extra-small`
  - `action-button-edge-to-hold-icon-small`
  - `asterisk-icon-size-75`
  - `corner-radius-75`
  - `drop-shadow-x`
  - `field-label-top-margin-small`
  - `status-light-dot-size-small`
  - `table-edge-to-content`

## 12.23.3

### Patch Changes

- 94959f1: Added font-size token $schema

  ## Token Diff

  Tokens with update $schema (15):

  - `font-size-50`
  - `font-size-75`
  - `font-size-100`
  - `font-size-200`
  - `font-size-300`
  - `font-size-400`
  - `font-size-500`
  - `font-size-600`
  - `font-size-700`
  - `font-size-800`
  - `font-size-900`
  - `font-size-1000`
  - `font-size-1100`
  - `font-size-1200`
  - `font-size-1300`

## 12.23.2

### Patch Changes

- 2af5a10: fix: aligns letter-spacing token schemas to "dimension" for consistency

## 12.23.1

### Patch Changes

- 51e0fee: Fixed typo and renamed `/schemas/token-types/percent.json` -> `/schemas/token-types/opacity.json`.

## 12.23.0

### Minor Changes

- 0b732aa: Basic types added to tokens
  Added testing for schema types

  ## Token Diff

  _Tokens modified (3):_

  - `color-handle-drop-shadow-color`: removed set specific definition
  - `color-handle-outer-border-color`: removed set specific definition
  - `picker-border-width`: added `express` value of 0

## 12.22.1

### Patch Changes

- 068dca4: Fixing a bug; `contextual-help-body-size` is referencing heading instead of body typography tokens.

  ### Token Diff

  _Token values updated (1):_

  - `contextual-help-body-size`
    - `desktop`: `heading-size-s` -> `body-size-s`
    - `mobile`: `heading-size-xs` -> `body-size-xs`

## 12.22.0

### Minor Changes

- f50ceea: Updated size for the Arrow UI icon used in submenus (previously was too small and looked imbalanced relative to everything else)

  ### Token Diff

  _Token values updated (4):_

  - `navigational-indicator-top-to-back-icon-small`: `desktop` `7px` -> `6px` and `mobile` `9px` -> `7px`
  - `navigational-indicator-top-to-back-icon-medium`: `desktop` `11px` -> `9px` and `mobile` `13px` -> `12px`
  - `navigational-indicator-top-to-back-icon-large`: `desktop` `14px` -> `12px` and `mobile` `17px` -> `16px`
  - `navigational-indicator-top-to-back-icon-extra-large`: `desktop` `17px` -> `15px` and `mobile` `22px` -> `19px`

## 12.21.0

### Minor Changes

- 9ee663d: Modified and new Side nav tokens

  ### Design Motivation

  Category headings changed to Adobe Clean 12 Medium @ `gray-600`, to differentiate them from multi-level, top navigation items.

  ### Token Diff

  Token added (1):

  - `side-navigation-header-to-item`

  Token value updated (1):

  - `side-navigation-item-to-header`: changed from `desktop: 16px` `mobile: 20px` to `desktop: 24px` `mobile: 30px`

## 12.20.0

### Minor Changes

- 9e42269: Added UI icon sizes

### Token Diff

_Tokens added (46):_

- `arrow-icon-size-100`
- `arrow-icon-size-200`
- `arrow-icon-size-300`
- `arrow-icon-size-400`
- `arrow-icon-size-500`
- `arrow-icon-size-600`
- `arrow-icon-size-75`
- `asterisk-icon-size-100`
- `asterisk-icon-size-200`
- `asterisk-icon-size-300`
- `asterisk-icon-size-75`
- `checkmark-icon-size-100`
- `checkmark-icon-size-200`
- `checkmark-icon-size-300`
- `checkmark-icon-size-400`
- `checkmark-icon-size-50`
- `checkmark-icon-size-500`
- `checkmark-icon-size-600`
- `checkmark-icon-size-75`
- `chevron-icon-size-100`
- `chevron-icon-size-200`
- `chevron-icon-size-300`
- `chevron-icon-size-400`
- `chevron-icon-size-50`
- `chevron-icon-size-500`
- `chevron-icon-size-600`
- `chevron-icon-size-75`
- `corner-triangle-icon-size-100`
- `corner-triangle-icon-size-200`
- `corner-triangle-icon-size-300`
- `corner-triangle-icon-size-75`
- `cross-icon-size-100`
- `cross-icon-size-200`
- `cross-icon-size-300`
- `cross-icon-size-400`
- `cross-icon-size-500`
- `cross-icon-size-600`
- `cross-icon-size-75`
- `dash-icon-size-100`
- `dash-icon-size-200`
- `dash-icon-size-300`
- `dash-icon-size-400`
- `dash-icon-size-50`
- `dash-icon-size-500`
- `dash-icon-size-600`
- `dash-icon-size-75`

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

### Token Diff

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

### Token Diff

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

### Token Diff

_Tokens added (1):_

- `menu-item-section-divider-height`

## 12.15.0

### Minor Changes

- fc12f6d: Added side-navigation token

### Token Diff

_Tokens added (1):_

- `side-navigation-bottom-to-text`

## 12.14.0

### Minor Changes

- cb9e3bf: Added in-field button tokens

### Token Diff

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

### Token diff

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

### Token Diff

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

### Token diff

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

### Token Diff

_Token added (1):_

- `picker-end-edge-to-disclosure-icon-quiet`

_Newly deprecated token (1):_

- `picker-end-edge-to-disclousure-icon-quiet`

## 12.10.0

### Minor Changes

- 0829c5d: Added UUIDs to each token

### Token Diff

_Modified Tokens (1154)_

Every token has a `uuid` property added to them.

## 12.9.1

### Patch Changes

- cace8d8: Fixed component name typo

### Token Diff

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

### Token Diff

_Token added (1):_

- `floating-action-button-drop-shadow-color`

_Newly deprecated token (1):_

- `floating-action-button-shadow-color` (use `floating-action-button-drop-shadow-color` instead)

## 12.8.0

### Minor Changes

- d639b4b: Updated color-handle-inner-border-opacity to remove express specific value

### Token Diff

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
