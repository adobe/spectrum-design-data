# @adobe/spectrum-tokens

## 13.0.0-beta.32

### Minor Changes

- [#325](https://github.com/adobe/spectrum-tokens/pull/325) [`095248e`](https://github.com/adobe/spectrum-tokens/commit/095248e26bdd1c8b65a61f3793646bb44093c38b) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - Added semantic aliases used by in-line alert.

  ## Token Diff

  _Tokens added (5):_

  - `informative-subtle-background-color-default`
  - `negative-subtle-background-color-default`
  - `neutral-subtle-background-color-default`
  - `notice-subtle-background-color-default`
  - `positive-subtle-background-color-default`

## 13.0.0-beta.31

### Minor Changes

- [#327](https://github.com/adobe/spectrum-tokens/pull/327) [`3caa31d`](https://github.com/adobe/spectrum-tokens/commit/3caa31d014a3d49496422c38a93c3c7645da0373) Thanks [@GarthDB](https://github.com/GarthDB)! - Added `private` metadata to global tokens.

## 13.0.0-beta.30

### Minor Changes

- [#321](https://github.com/adobe/spectrum-tokens/pull/321) [`e392c49`](https://github.com/adobe/spectrum-tokens/commit/e392c497a4d474c9619a882ad9ab4948441712e0) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - Added new Standard dialog, status light, and updated alert-banner-top-to-workflow-icon tokens

  ## Token Diff

  _Tokens added (10):_

  - `standard-dialog-body-font-size`
  - `standard-dialog-maximum-width-large`
  - `standard-dialog-maximum-width-medium`
  - `standard-dialog-maximum-width-small`
  - `standard-dialog-minimum-width`
  - `standard-dialog-title-font-size`
  - `status-light-text-to-visual-100`
  - `status-light-text-to-visual-200`
  - `status-light-text-to-visual-300`
  - `status-light-text-to-visual-75`

  _Token values updated (10):_

  - `alert-banner-to-top-workflow-icon`
  - `alert-banner-top-to-workflow-icon`
  - `status-light-dot-size-extra-large`
  - `status-light-dot-size-large`
  - `status-light-dot-size-medium`
  - `status-light-top-to-dot-extra-large`
  - `status-light-top-to-dot-large`
  - `status-light-top-to-dot-medium`
  - `status-light-top-to-dot-small`
  - `status-light-dot-size-small`

## 13.0.0-beta.29

### Minor Changes

- [#319](https://github.com/adobe/spectrum-tokens/pull/319) [`5f962fc`](https://github.com/adobe/spectrum-tokens/commit/5f962fc864c516213db58bece2c47a74c68cc985) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - Updated values for component pill edge to visual only tokens for both desktop and mobile.

  These values are updated based on the new workflow icon size.

  ## Token Diff

  _Token values updated (4):_

  - `component-pill-edge-to-visual-only-100`
  - `component-pill-edge-to-visual-only-200`
  - `component-pill-edge-to-visual-only-300`
  - `component-pill-edge-to-visual-only-75`

- [#316](https://github.com/adobe/spectrum-tokens/pull/316) [`664ab0b`](https://github.com/adobe/spectrum-tokens/commit/664ab0bba68b9f4752599ed73c98b5d339414478) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - S2 Color loupe tokens update (color-only)

  ## Token Diff

  _Newly deprecated tokens (2):_

  - `color-loupe-drop-shadow-color`
  - `drop-shadow-color`

## 13.0.0-beta.28

### Patch Changes

- 1150331: Removed duplicate tokens from src files.

## 13.0.0-beta.27

### Minor Changes

- 3236495: Updated coach mark tokens for both desktop and mobile

  ## Token Diff

  _Tokens added (6):_

  - `coach-mark-body-font-size`
  - `coach-mark-pagination-body-font-size`
  - `coach-mark-title-font-size`

  _Newly deprecated tokens (3):_

  - `coach-mark-body-size`
  - `coach-mark-pagination-body-size`
  - `coach-mark-title-size`

## 13.0.0-beta.26

### Minor Changes

- b59fa8f: Updated alert dialog tokens

  ## Token Diff

  _Tokens added (4):_

  - `alert-dialog-description-font-size`
  - `alert-dialog-description-size`
  - `alert-dialog-title-font-size`
  - `alert-dialog-title-size`

  _Newly deprecated tokens (2):_

  - `alert-dialog-description-size`
  - `alert-dialog-title-size`

## 13.0.0-beta.25

### Minor Changes

- e79ddd6: S2 Combo box, In-field button and In-field progress circle updates

  ## Motivation and context

  These changes occurred as a result of scaling things for S2 design language and experiences.

  ## Token Diff

  _Tokens added (15):_

  - `combo-box-visual-to-field-button`
  - `combo-box-visual-to-field-button-extra-large`
  - `combo-box-visual-to-field-button-large`
  - `combo-box-visual-to-field-button-medium`
  - `combo-box-visual-to-field-button-quiet`
  - `combo-box-visual-to-field-button-small`
  - `in-field-button-edge-to-fill-extra-large`
  - `in-field-button-edge-to-fill-large`
  - `in-field-button-edge-to-fill-medium`
  - `in-field-button-edge-to-fill-small`
  - `in-field-progress-circle-edge-to-fill`
  - `in-field-progress-circle-size-100`
  - `in-field-progress-circle-size-200`
  - `in-field-progress-circle-size-300`
  - `in-field-progress-circle-size-75`

  _Newly deprecated tokens (6):_

  - `combo-box-quiet-minimum-width-multiplier`
  - `combo-box-visual-to-field-button-small`
  - `combo-box-visual-to-field-button-medium`
  - `combo-box-visual-to-field-button-large`
  - `combo-box-visual-to-field-button-extra-large`
  - `in-field-button-edge-to-fill`

- e79ddd6: S2 Color loupe tokens update

  ## Design Motivation

  These changes occurred as a result of scaling things for S2 design language and experiences.

  ## Token Diff

  _Newly deprecated tokens (2):_

  - `color-loupe-drop-shadow-blur`
  - `color-loupe-drop-shadow-y`

## 13.0.0-beta.24

### Major Changes

- 1c8f7ab: Renamed previous drop shadow tokens from S1 and pointed them to the new `100` S2 drop shadow tokens
  Added new drop shadow tokens, `100`, `200`, `emphasized-default`, `emphasized-hover`, `elevated`.

  ## Design Motivation

  These tokens reflect the updates to drop tokens foundations in Spectrum 2, allowing more options and flexibility of usage in containers

  ## Token Diff

  _Tokens added (24):_

  - `drop-shadow-blur`
  - `drop-shadow-blur-100`
  - `drop-shadow-blur-200`
  - `drop-shadow-color`
  - `drop-shadow-color-100`
  - `drop-shadow-color-200`
  - `drop-shadow-elevated-blur`
  - `drop-shadow-elevated-color`
  - `drop-shadow-elevated-x`
  - `drop-shadow-elevated-y`
  - `drop-shadow-emphasized-default-blur`
  - `drop-shadow-emphasized-default-color`
  - `drop-shadow-emphasized-default-x`
  - `drop-shadow-emphasized-default-y`
  - `drop-shadow-emphasized-hover-blur`
  - `drop-shadow-emphasized-hover-color`
  - `drop-shadow-emphasized-hover-x`
  - `drop-shadow-emphasized-hover-y`
  - `drop-shadow-x`
  - `drop-shadow-x-100`
  - `drop-shadow-x-200`
  - `drop-shadow-y`
  - `drop-shadow-y-100`
  - `drop-shadow-y-200`

  _Tokens deleted (2):_

  - `drop-shadow-blur`
  - `drop-shadow-y`

  _Token values updated (2):_

  - `color-handle-drop-shadow-color`
  - `drop-shadow-color`

### Minor Changes

- 3230aba: Updated and added S2 drop shadow tokens

  ## Design Motivation

  These changes occurred as a result of scaling things for S2 design language and experiences.

  ## Token Diff

  _Tokens added (7):_

  - `field-default-width-extra-large`
  - `field-default-width-large`
  - `field-default-width-medium`
  - `field-default-width-small`
  - `tag-minimum-width-large`
  - `tag-minimum-width-medium`
  - `tag-minimum-width-small`

  _Token values updated (4):_

  - `field-top-to-progress-circle-extra-large`
  - `field-top-to-progress-circle-large`
  - `field-top-to-progress-circle-medium`
  - `field-top-to-progress-circle-small`

  _Newly Deprecated Tokens (4):_

  - `field-width-extra-large`
  - `field-width-large`
  - `field-width-medium`
  - `field-width-small`

## 13.0.0-beta.23

### Patch Changes

- 936f608: Fixed misnamed accordion token.

  ## Token Diff

  _Tokens added (1):_

  - `accordion-top-to-text-spacious-small`

  _Newly deprecated token (1):_

  - `accordion-small-top-to-text-spacious`

## 13.0.0-beta.22

### Minor Changes

- c42448c: Updated and added alert dialog tokens for both desktop and mobile.

  ## Design Motivation

  Title text in alert dialog is now using the new Title typography token. Also updated the size for description text, and added a new token for top to alert icon.

  Title is a new typography style for Spectrum 2, and has a default `title-color` token.

  ## Token Diff

  _Tokens added (2):_

  - `alert-banner-top-to-alert-icon`
  - `title-color`

  _Token values updated (2):_

  - `alert-dialog-description-size`
  - `alert-dialog-title-size`

- 46a801c: Added tokens for S2 title color

## 13.0.0-beta.21

### Minor Changes

- d71bea1: S2 Opacity checkerboard non-color token updates

  ## Design Motivation

  These changes occurred as a result of scaling things for S2 design language and experiences.

  ## Token Diff

  _Tokens added (2):_

  - `opacity-checkerboard-square-size-medium`
  - `opacity-checkerboard-square-size-small`

  _Newly deprecated token (1):_

  - `opacity-checkerboard-square-size`

## 13.0.0-beta.20

### Minor Changes

- fb61f17: Added Title typography tokens

  ## Design Motivation

  Adding new typography styles for Title. While the Heading style is for the loudest, most broad message, there are still going to be other important items in your information hierarchy. The Title style is for text that’s communicating other need-to-know concepts. It’s often set in Bold weight, and it has a range of font sizes that can be paired with Body and Detail sizes to create visual balance. File names, cards, user names, panels, and other high-signal concepts in interfaces use the Title style.

  ## Token Diff

  _Tokens added (45):_

  - `title-cjk-emphasized-font-style`
  - `title-cjk-emphasized-font-weight`
  - `title-cjk-font-family`
  - `title-cjk-font-style`
  - `title-cjk-font-weight`
  - `title-cjk-line-height`
  - `title-cjk-size-l`
  - `title-cjk-size-m`
  - `title-cjk-size-s`
  - `title-cjk-size-xl`
  - `title-cjk-size-xs`
  - `title-cjk-size-xxl`
  - `title-cjk-size-xxxl`
  - `title-cjk-strong-emphasized-font-style`
  - `title-cjk-strong-emphasized-font-weight`
  - `title-cjk-strong-font-style`
  - `title-cjk-strong-font-weight`
  - `title-line-height`
  - `title-margin-bottom-multiplier`
  - `title-margin-top-multiplier`
  - `title-sans-serif-emphasized-font-style`
  - `title-sans-serif-emphasized-font-weight`
  - `title-sans-serif-font-family`
  - `title-sans-serif-font-style`
  - `title-sans-serif-font-weight`
  - `title-sans-serif-strong-emphasized-font-style`
  - `title-sans-serif-strong-emphasized-font-weight`
  - `title-sans-serif-strong-font-style`
  - `title-sans-serif-strong-font-weight`
  - `title-serif-emphasized-font-style`
  - `title-serif-emphasized-font-weight`
  - `title-serif-font-family`
  - `title-serif-font-style`
  - `title-serif-font-weight`
  - `title-serif-strong-emphasized-font-style`
  - `title-serif-strong-emphasized-font-weight`
  - `title-serif-strong-font-style`
  - `title-serif-strong-font-weight`
  - `title-size-l`
  - `title-size-m`
  - `title-size-s`
  - `title-size-xl`
  - `title-size-xs`
  - `title-size-xxl`
  - `title-size-xxxl`

## 13.0.0-beta.19

### Minor Changes

- 723d3b0: Updated, added, and deprecated tokens for text field and text area.

  ## Design Motivation

  Updating text field and text area for Spectrum 2.

  ## Token Diff

  _Tokens added (4):_

  - `field-width-small`
  - `field-width-medium`
  - `field-width-large`
  - `field-width-extra-large`

  _Updated token values (4):_

  - `side-label-character-count-top-margin-small`
  - `side-label-character-count-top-margin-medium`
  - `side-label-character-count-top-margin-large`
  - `side-label-character-count-top-margin-extra-large`

  _Newly deprecated tokens (8):_

  - `field-width`
  - `field-edge-to-text-quiet`
  - `field-edge-to-border-quiet`
  - `field-edge-to-alert-icon-quiet`
  - `field-edge-to-validation-icon-quiet`
  - `field-label-to-component-quiet-small`
  - `field-label-to-component-quiet-medium`
  - `field-label-to-component-quiet-large`
  - `field-label-to-component-quiet-extra-large`
  - `character-count-to-field-quiet-small`
  - `character-count-to-field-quiet-medium`
  - `character-count-to-field-quiet-large`
  - `character-count-to-field-quiet-extra-large`

- 66b1edf: Updated color of color-area-border-color token from gray.900 to gray.1000 in both light and dark sets.

  ## Design motivation

  These changes occurred as a result of scaling things for S2 design language and experiences.

  ## Token Diff

  _Token value updated (1):_

  - `color-area-border-color`

- 7b5f18b: Update alert banner for Spectrum 2

  ## Design Motivation

  These changes occurred as a result of scaling things for S2 design language and experiences.

  ## Token Diff

  _Token values updated (5):_

  - `alert-banner-bottom-to-text`
  - `alert-banner-minimum-height`
  - `alert-banner-top-to-text`
  - `alert-banner-top-to-workflow-icon`
  - `search-field-minimum-width-multiplier`

- 4a84fdd: Spectrum 2 Toast Tokens

  ## Design motivation

  Updated the `color-area-border-rounding` token type from spacing to borderRadius and adjusted value referenced, desktop and mobile scale.

  These changes occurred as a result of scaling things for S2 design language and experiences.

  ## Token Diff

  _Token values updated (5):_

  - `toast-height`
  - `toast-top-to-workflow-icon`
  - `toast-top-to-text`
  - `toast-bottom-to-text`
  - `color-area-border-rounding`

## 13.0.0-beta.18

### Minor Changes

- 940bd78: Updated background aliases in dark theme; added new non-semantic colors

  ## Design Motivation

  The existing background colors were updated for better consistency across semantic and non-semantic variants of the Badge component. The colors also introduce some general improved contrast in dark theme across other components using these aliases.
  The new non-semantic visual and background colors were added because new hues were introduced. These colors will be used in status light and badge components, respectively.

  ## Token Diff

  _Tokens added (10):_

  - `brown-background-color-default`
  - `brown-visual-color`
  - `cinnamon-background-color-default`
  - `cinnamon-visual-color`
  - `pink-background-color-default`
  - `pink-visual-color`
  - `silver-background-color-default`
  - `silver-visual-color`
  - `turquoise-background-color-default`
  - `turquoise-visual-color`

  _Token values updated (27):_

  - `accent-background-color-default`
  - `accent-background-color-down`
  - `accent-background-color-hover`
  - `accent-background-color-key-focus`
  - `celery-background-color-default`
  - `chartreuse-background-color-default`
  - `gray-background-color-default`
  - `informative-background-color-default`
  - `informative-background-color-down`
  - `informative-background-color-hover`
  - `informative-background-color-key-focus`
  - `negative-background-color-default`
  - `negative-background-color-down`
  - `negative-background-color-hover`
  - `negative-background-color-key-focus`
  - `neutral-subdued-background-color-default`
  - `neutral-subdued-background-color-down`
  - `neutral-subdued-background-color-hover`
  - `neutral-subdued-background-color-key-focus`
  - `notice-background-color-default`
  - `orange-background-color-default`
  - `positive-background-color-default`
  - `positive-background-color-down`
  - `positive-background-color-hover`
  - `positive-background-color-key-focus`
  - `table-selected-row-background-color`
  - `yellow-background-color-default`

## 13.0.0-beta.17

### Minor Changes

- 9072ae7: `color-slider-border-color` token was updated to reference `gray-1000` instead of `gray-90`0 in both light and dark themes.
- 912e307: Updated `color-slider-border-rounding` token to use 7px instead of 4px in desktop only.
  This token value update is the same value used by alias token: `corner-radius-medium-size-small`.

  ## Design Motivation

  S2 color slider design changes.

  ## Token Diff

  _Token values updated (2):_

  - `color-slider-border-color`
  - `color-slider-border-rounding`

## 13.0.0-beta.16

### Minor Changes

- 80a3fec: New non-color tokens for S2 tag component added to both desktop and mobile layout.component sets.

  ## Design Motivation

  New values for tag component for S2.

  ## Token Diff

  _Tokens added (9):_

  - `tag-edge-to-clear-icon-large`
  - `tag-edge-to-clear-icon-medium`
  - `tag-edge-to-clear-icon-small`
  - `tag-label-clear-icon-large`
  - `tag-label-to-clear-icon-large`
  - `tag-label-to-clear-icon-medium`
  - `tag-label-to-clear-icon-small`
  - `tag-maximum-width-multiplier`
  - `tag-minimum-width-multiplier`

## 13.0.0-beta.15

### Minor Changes

- c7c1d81: Added new semantic color aliases to Tokens Studio, in the S2 color tokens, alias sets for both light and dark themes.
- 4b78009: Updated values and added new tokens for Switch.

  ## Design Motivation

  New negative-subdued background tokens were needed for negative and not selected tag components.

  Added new tokens: `switch-handle-size-_` and `switch-handle-selected-size-_` for both desktop and mobile.
  Update token values on: `switch-control-width-_` and `switch-control-height-_` for both desktop and mobile.

  The design for Switch in S2 has changed and now has a border when it's not selected. New handle sizes are added and control sizes have been updated.

  ## Token Diff

  _Tokens added (12):_

  - `negative-subdued-background-color-default`
  - `negative-subdued-background-color-down`
  - `negative-subdued-background-color-hover`
  - `negative-subdued-background-color-key-focus`
  - `switch-handle-selected-size-extra-large`
  - `switch-handle-selected-size-large`
  - `switch-handle-selected-size-medium`
  - `switch-handle-selected-size-small`
  - `switch-handle-size-extra-large`
  - `switch-handle-size-large`
  - `switch-handle-size-medium`
  - `switch-handle-size-small`

  _Token values updated (8):_

  - `switch-control-height-extra-large`
  - `switch-control-height-large`
  - `switch-control-height-medium`
  - `switch-control-height-small`
  - `switch-control-width-extra-large`
  - `switch-control-width-large`
  - `switch-control-width-medium`
  - `switch-control-width-small`

## 13.0.0-beta.14

### Minor Changes

- f004b0c: The tokens listed in the diff below had identical values between sets and so were merged to single values to simplify the data.

  ## Token Diff

  _Tokens values updated (46):_

  - `accordion-disclosure-indicator-to-text`
  - `accordion-edge-to-disclosure-indicator`
  - `accordion-edge-to-text`
  - `accordion-focus-indicator-gap`
  - `accordion-top-to-text-compact-medium`
  - `accordion-top-to-text-compact-small`
  - `action-button-edge-to-hold-icon-extra-small`
  - `action-button-edge-to-hold-icon-small`
  - `asterisk-icon-size-75`
  - `background-base-color`
  - `background-layer-1-color`
  - `color-area-border-rounding`
  - `corner-radius-0`
  - `corner-radius-100`
  - `corner-radius-1000`
  - `corner-radius-200`
  - `corner-radius-300`
  - `corner-radius-400`
  - `corner-radius-500`
  - `corner-radius-600`
  - `corner-radius-700`
  - `corner-radius-75`
  - `corner-radius-800`
  - `corner-radius-extra-large-default`
  - `corner-radius-full`
  - `corner-radius-large-default`
  - `corner-radius-medium-default`
  - `corner-radius-medium-size-extra-large`
  - `corner-radius-medium-size-extra-small`
  - `corner-radius-medium-size-large`
  - `corner-radius-medium-size-medium`
  - `corner-radius-medium-size-small`
  - `corner-radius-none`
  - `corner-radius-small-default`
  - `corner-radius-small-size-extra-large`
  - `corner-radius-small-size-large`
  - `corner-radius-small-size-medium`
  - `corner-radius-small-size-small`
  - `drop-shadow-x`
  - `field-label-top-margin-extra-large`
  - `field-label-top-margin-large`
  - `field-label-top-margin-medium`
  - `field-label-top-margin-small`
  - `gray-background-color-default`
  - `status-light-dot-size-small`
  - `table-edge-to-content`

## 13.0.0-beta.13

### Minor Changes

- ef600c4: ## Design Motivation

  - The updated tooltip component in Spectrum 2 has a larger, slightly rounded tip
  - Added tokens for horizontal and vertical orientation

  ## Tokens Diff

  _Tokens added (3):_

  - `divider-horizontal-minimum-width`
  - `divider-vertical-minimum-height`
  - `tooltip-tip-corner-radius`

  _Token values updated (2):_

  - `tooltip-tip-height`
  - `tooltip-tip-width`

## 13.0.0-beta.12

### Minor Changes

- c87d743: Updates to spacing tokens for the S2 field label component include:

  Token: field-label-top-to-asterisk-[medium, large, extra-large]. Only value for extra-large token required updating in the desktop scale. All other sizes presented accurate values.

  Token: field-label-top-margin-[medium, large, extra-large]. All values were updated to reflect 0px for both desktop and mobile scales

  ## Design Motivation

  These changes occurred as a result of updates to the field label component for S2.

  ## Token Diff

  _Token values updated (4):_

  - `field-label-top-margin-extra-large`
  - `field-label-top-margin-large`
  - `field-label-top-margin-medium`
  - `field-label-top-to-asterisk-extra-large`

  ## Schema Diff

  Adds missing schema information for `corner-radius-1000`. Also added `schemas/token-types/multiplier.json` to the `scale-set` schema.

## 13.0.0-beta.11

### Minor Changes

- 3c6303a: Updated text-to-visual-300 mobile value from 11px to 10px.

  ## Design Motivation

  To better follow our logarithmic scale rounding principle.

  ## Token Diff

  _Token values updated (1):_

  - `text-to-visual-300`

- 6579966: existing corner-radius tokens, adding net-new global corner radius tokens, and introducing new alias names that point to these global values.

  ## Design Motivation

  More on Spectrum 2 rounding: https://s2.spectrum.corp.adobe.com/page/object-styles/#rounding

  In Spectrum 2, rounding also applies to the different t-shirt sized components and varies based on a Major Second logarithmic scale, rounded to whole numbers to avoid using half-pixels. This allows for components to retain a consistent and identifiable shape at all sizes. Because of this there are now component size specific tokens like corner-radius-small-size-medium or corner-radius-medium-size-extra-large to help us keep track of the nuance within t-shirt sizes.

  ## Token Diff

  _Tokens added (23):_

  - `corner-radius-0`
  - `corner-radius-300`
  - `corner-radius-400`
  - `corner-radius-500`
  - `corner-radius-600`
  - `corner-radius-700`
  - `corner-radius-800`
  - `corner-radius-1000`
  - `corner-radius-extra-large-default`
  - `corner-radius-full`
  - `corner-radius-large-default`
  - `corner-radius-medium-default`
  - `corner-radius-medium-size-extra-small`
  - `corner-radius-medium-size-small`
  - `corner-radius-medium-size-medium`
  - `corner-radius-medium-size-large`
  - `corner-radius-medium-size-extra-large`
  - `corner-radius-none`
  - `corner-radius-small-default`
  - `corner-radius-small-size-small`
  - `corner-radius-small-size-medium`
  - `corner-radius-small-size-large`
  - `corner-radius-small-size-extra-large`

  _Token values updated (3):_

  - `corner-radius-75`
  - `corner-radius-100`
  - `corner-radius-200`

## 13.0.0-beta.10

### Minor Changes

- 23d9085: Updated desktop and mobile values for component-edge-to-visual-only tokens.

  Spacing changed due to new workflow icon sizes.

  ## Token Diff

  _Token values updated (5):_

  - `component-edge-to-visual-only-100`
  - `component-edge-to-visual-only-200`
  - `component-edge-to-visual-only-300`
  - `component-edge-to-visual-only-50`
  - `component-edge-to-visual-only-75`

- c5430b7: Updated help-text-top-to-workflow-icon-_ token values to point to component-top-to-workflow-icon-_ tokens

  ## Token Diff

  _Newly deprecated tokens (4):_

  - `help-text-top-to-workflow-icon-extra-large`: use `component-edge-to-visual-only-300`
  - `help-text-top-to-workflow-icon-large`: use `component-edge-to-visual-only-200`
  - `help-text-top-to-workflow-icon-medium`: use `component-edge-to-visual-only-100`
  - `help-text-top-to-workflow-icon-small`: use `component-edge-to-visual-only-75`

## 13.0.0-beta.9

### Minor Changes

- cf09c84: Updated workflow-icon-size-50, 75, 100, 200, 300 with Spectrum 2 values in mobile and desktop.
  Updated component-top-to-workflow and text-to-visual padding.
  Added 3 new non-color tokens for S2 component downstates in Tokens Studio.

  ## Design Motivation

  Spectrum 2 icons have a different workflow icon sizing with base sizes 20 px (desktop), 24 px (mobile).

  Updated padding values due to new workflow icon sizes in S2.

  These tokens are used to calculate the perspective transform in CSS to achieve the effect of a component scaling down for down states in Spectrum 2. This is not applicable to all components.

  ## Tokens Diff

  _Tokens added (3):_

  - `component-size-difference-down`
  - `component-size-minimum-perspective-down`
  - `component-size-width-ratio-down`

  _Token values updated (15):_

  - `component-top-to-workflow-icon-100`
  - `component-top-to-workflow-icon-200`
  - `component-top-to-workflow-icon-300`
  - `component-top-to-workflow-icon-50`
  - `component-top-to-workflow-icon-75`
  - `text-to-visual-100`
  - `text-to-visual-200`
  - `text-to-visual-300`
  - `text-to-visual-50`
  - `text-to-visual-75`
  - `workflow-icon-size-100`
  - `workflow-icon-size-200`
  - `workflow-icon-size-300`
  - `workflow-icon-size-50`
  - `workflow-icon-size-75`

## 13.0.0-beta.8

### Minor Changes

- 507f3c2: Added new and updating existing background layer tokens to S2 set in Tokens Studio and S2/Variables. Also reordered token organization to reflect proper usage based on [S2 guidelines](https://s2.spectrum.corp.adobe.com/page/background-layers/#editing-contexts).

  ## Design Motivation

  In Spectrum 2, background layers are used differently depending on the primary context of the page. We now have a full set of tokens to help users distinguish between primary purposes, editing vs browsing.

  ## Token Diff

  _Tokens added (2):_

  - `background-elevated-color`
  - `background-pasteboard-color`

  _Token values updated (1):_

  - `background-base-color`

## 13.0.0-beta.7

### Minor Changes

- 4853f76: Added schema to all tokens and fixed values that didn't meet schema requirements

  ## Token Diff

  _Token values updated (328):_

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
  - `blue-100`
  - `blue-1000`
  - `blue-1100`
  - `blue-1200`
  - `blue-1300`
  - `blue-1400`
  - `blue-200`
  - `blue-300`
  - `blue-400`
  - `blue-500`
  - `blue-600`
  - `blue-700`
  - `blue-800`
  - `blue-900`
  - `blue-background-color-default`
  - `blue-visual-color`
  - `celery-100`
  - `celery-1000`
  - `celery-1100`
  - `celery-1200`
  - `celery-1300`
  - `celery-1400`
  - `celery-200`
  - `celery-300`
  - `celery-400`
  - `celery-500`
  - `celery-600`
  - `celery-700`
  - `celery-800`
  - `celery-900`
  - `celery-background-color-default`
  - `celery-visual-color`
  - `chartreuse-100`
  - `chartreuse-1000`
  - `chartreuse-1100`
  - `chartreuse-1200`
  - `chartreuse-1300`
  - `chartreuse-1400`
  - `chartreuse-200`
  - `chartreuse-300`
  - `chartreuse-400`
  - `chartreuse-500`
  - `chartreuse-600`
  - `chartreuse-700`
  - `chartreuse-800`
  - `chartreuse-900`
  - `chartreuse-background-color-default`
  - `chartreuse-visual-color`
  - `contextual-help-body-size`
  - `cyan-100`
  - `cyan-1000`
  - `cyan-1100`
  - `cyan-1200`
  - `cyan-1300`
  - `cyan-1400`
  - `cyan-200`
  - `cyan-300`
  - `cyan-400`
  - `cyan-500`
  - `cyan-600`
  - `cyan-700`
  - `cyan-800`
  - `cyan-900`
  - `cyan-background-color-default`
  - `cyan-visual-color`
  - `drop-zone-background-color`
  - `focus-indicator-color`
  - `fuchsia-100`
  - `fuchsia-1000`
  - `fuchsia-1100`
  - `fuchsia-1200`
  - `fuchsia-1300`
  - `fuchsia-1400`
  - `fuchsia-200`
  - `fuchsia-300`
  - `fuchsia-400`
  - `fuchsia-500`
  - `fuchsia-600`
  - `fuchsia-700`
  - `fuchsia-800`
  - `fuchsia-900`
  - `fuchsia-background-color-default`
  - `fuchsia-visual-color`
  - `green-100`
  - `green-1000`
  - `green-1100`
  - `green-1200`
  - `green-1300`
  - `green-1400`
  - `green-200`
  - `green-300`
  - `green-400`
  - `green-500`
  - `green-600`
  - `green-700`
  - `green-800`
  - `green-900`
  - `green-background-color-default`
  - `green-visual-color`
  - `icon-color-blue-primary-default`
  - `icon-color-green-primary-default`
  - `icon-color-red-primary-default`
  - `icon-color-yellow-primary-default`
  - `indigo-100`
  - `indigo-1000`
  - `indigo-1100`
  - `indigo-1200`
  - `indigo-1300`
  - `indigo-1400`
  - `indigo-200`
  - `indigo-300`
  - `indigo-400`
  - `indigo-500`
  - `indigo-600`
  - `indigo-700`
  - `indigo-800`
  - `indigo-900`
  - `indigo-background-color-default`
  - `indigo-visual-color`
  - `informative-background-color-default`
  - `informative-background-color-down`
  - `informative-background-color-hover`
  - `informative-background-color-key-focus`
  - `informative-color-100`
  - `informative-color-1000`
  - `informative-color-1100`
  - `informative-color-1200`
  - `informative-color-1300`
  - `informative-color-1400`
  - `informative-color-200`
  - `informative-color-300`
  - `informative-color-400`
  - `informative-color-500`
  - `informative-color-600`
  - `informative-color-700`
  - `informative-color-800`
  - `informative-color-900`
  - `informative-visual-color`
  - `magenta-100`
  - `magenta-1000`
  - `magenta-1100`
  - `magenta-1200`
  - `magenta-1300`
  - `magenta-1400`
  - `magenta-200`
  - `magenta-300`
  - `magenta-400`
  - `magenta-500`
  - `magenta-600`
  - `magenta-700`
  - `magenta-800`
  - `magenta-900`
  - `magenta-background-color-default`
  - `magenta-visual-color`
  - `navigational-indicator-top-to-back-icon-extra-large`
  - `navigational-indicator-top-to-back-icon-large`
  - `navigational-indicator-top-to-back-icon-medium`
  - `navigational-indicator-top-to-back-icon-small`
  - `negative-background-color-default`
  - `negative-background-color-down`
  - `negative-background-color-hover`
  - `negative-background-color-key-focus`
  - `negative-border-color-default`
  - `negative-border-color-down`
  - `negative-border-color-focus`
  - `negative-border-color-focus-hover`
  - `negative-border-color-hover`
  - `negative-border-color-key-focus`
  - `negative-color-100`
  - `negative-color-1000`
  - `negative-color-1100`
  - `negative-color-1200`
  - `negative-color-1300`
  - `negative-color-1400`
  - `negative-color-200`
  - `negative-color-300`
  - `negative-color-400`
  - `negative-color-500`
  - `negative-color-600`
  - `negative-color-700`
  - `negative-color-800`
  - `negative-color-900`
  - `negative-content-color-default`
  - `negative-content-color-down`
  - `negative-content-color-hover`
  - `negative-content-color-key-focus`
  - `negative-visual-color`
  - `notice-background-color-default`
  - `notice-color-100`
  - `notice-color-1000`
  - `notice-color-1100`
  - `notice-color-1200`
  - `notice-color-1300`
  - `notice-color-1400`
  - `notice-color-200`
  - `notice-color-300`
  - `notice-color-400`
  - `notice-color-500`
  - `notice-color-600`
  - `notice-color-700`
  - `notice-color-800`
  - `notice-color-900`
  - `notice-visual-color`
  - `orange-100`
  - `orange-1000`
  - `orange-1100`
  - `orange-1200`
  - `orange-1300`
  - `orange-1400`
  - `orange-200`
  - `orange-300`
  - `orange-400`
  - `orange-500`
  - `orange-600`
  - `orange-700`
  - `orange-800`
  - `orange-900`
  - `orange-background-color-default`
  - `orange-visual-color`
  - `positive-background-color-default`
  - `positive-background-color-down`
  - `positive-background-color-hover`
  - `positive-background-color-key-focus`
  - `positive-color-100`
  - `positive-color-1000`
  - `positive-color-1100`
  - `positive-color-1200`
  - `positive-color-1300`
  - `positive-color-1400`
  - `positive-color-200`
  - `positive-color-300`
  - `positive-color-400`
  - `positive-color-500`
  - `positive-color-600`
  - `positive-color-700`
  - `positive-color-800`
  - `positive-color-900`
  - `positive-visual-color`
  - `purple-100`
  - `purple-1000`
  - `purple-1100`
  - `purple-1200`
  - `purple-1300`
  - `purple-1400`
  - `purple-200`
  - `purple-300`
  - `purple-400`
  - `purple-500`
  - `purple-600`
  - `purple-700`
  - `purple-800`
  - `purple-900`
  - `purple-background-color-default`
  - `purple-visual-color`
  - `red-100`
  - `red-1000`
  - `red-1100`
  - `red-1200`
  - `red-1300`
  - `red-1400`
  - `red-200`
  - `red-300`
  - `red-400`
  - `red-500`
  - `red-600`
  - `red-700`
  - `red-800`
  - `red-900`
  - `red-background-color-default`
  - `red-visual-color`
  - `seafoam-100`
  - `seafoam-1000`
  - `seafoam-1100`
  - `seafoam-1200`
  - `seafoam-1300`
  - `seafoam-1400`
  - `seafoam-200`
  - `seafoam-300`
  - `seafoam-400`
  - `seafoam-500`
  - `seafoam-600`
  - `seafoam-700`
  - `seafoam-800`
  - `seafoam-900`
  - `seafoam-background-color-default`
  - `seafoam-visual-color`
  - `side-navigation-item-to-header`
  - `table-selected-row-background-color`
  - `yellow-100`
  - `yellow-1000`
  - `yellow-1100`
  - `yellow-1200`
  - `yellow-1300`
  - `yellow-1400`
  - `yellow-200`
  - `yellow-300`
  - `yellow-400`
  - `yellow-500`
  - `yellow-600`
  - `yellow-700`
  - `yellow-800`
  - `yellow-900`
  - `yellow-background-color-default`
  - `yellow-visual-color`

## 13.0.0-beta.6

### Minor Changes

- 6d1c661: Added new Spectrum 2 color tokens for both light and dark themes:

  Cinnamon 100 to 1600

  ## Design Motivation

  This is the last new color that is a part of the new color set needed from Premiere Pro. The additional color will also help when creating new data vis color palettes for Spectrum 2.

  ## Token Diff

  _Tokens added (17):_

  - `cinnamon-100`
  - `cinnamon-200`
  - `cinnamon-300`
  - `cinnamon-400`
  - `cinnamon-500`
  - `cinnamon-600`
  - `cinnamon-700`
  - `cinnamon-800`
  - `cinnamon-900`
  - `cinnamon-1000`
  - `cinnamon-1100`
  - `cinnamon-1200`
  - `cinnamon-1300`
  - `cinnamon-1400`
  - `cinnamon-1500`
  - `cinnamon-1600`

- 91d7e95: Fixed bug in the light theme value for notice-background-color-default, from notice-color-800 to notice-color-600

  ## Design Motivation

  While updating the badge component in Figma, we noticed a bug where notice-background-color-default in S2 was entered incorrectly for light theme, and should instead match the value for S1

  ## Token Diff

  _Token values updated (1):_

  - `notice-background-color-default`: `light`: `notice-color-800` -> `notice-color-600`

## 13.0.0-beta.5

### Major Changes

- 0af2674: feat: new color values for spectrum2

  ## Design Motivation

  This update addresses several improvements:

  fuchsia, seafoam: all values shifted to make room for new colors, pink and turquoise
  all other colors: certain values were updated to address accessibility contrast requirements against Spectrum 2 background layer colors

  ## Token Diff

  <details><summary><strong>Token values updated (246):</strong></summary>

  - `accent-background-color-default`
  - `accent-background-color-down`
  - `accent-background-color-hover`
  - `accent-background-color-key-focus`
  - `accent-color-1000`
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
  - `blue-1000`
  - `blue-200`
  - `blue-300`
  - `blue-400`
  - `blue-500`
  - `blue-600`
  - `blue-700`
  - `blue-800`
  - `blue-900`
  - `blue-background-color-default`
  - `blue-visual-color`
  - `celery-1000`
  - `celery-200`
  - `celery-300`
  - `celery-400`
  - `celery-500`
  - `celery-600`
  - `celery-700`
  - `celery-800`
  - `celery-900`
  - `celery-background-color-default`
  - `celery-visual-color`
  - `chartreuse-1000`
  - `chartreuse-200`
  - `chartreuse-300`
  - `chartreuse-400`
  - `chartreuse-500`
  - `chartreuse-600`
  - `chartreuse-700`
  - `chartreuse-800`
  - `chartreuse-900`
  - `chartreuse-background-color-default`
  - `chartreuse-visual-color`
  - `cyan-1000`
  - `cyan-300`
  - `cyan-400`
  - `cyan-500`
  - `cyan-600`
  - `cyan-700`
  - `cyan-800`
  - `cyan-900`
  - `cyan-background-color-default`
  - `cyan-visual-color`
  - `drop-zone-background-color`
  - `focus-indicator-color`
  - `fuchsia-100`
  - `fuchsia-1000`
  - `fuchsia-1100`
  - `fuchsia-1200`
  - `fuchsia-1300`
  - `fuchsia-1400`
  - `fuchsia-1500`
  - `fuchsia-1600`
  - `fuchsia-200`
  - `fuchsia-300`
  - `fuchsia-400`
  - `fuchsia-500`
  - `fuchsia-600`
  - `fuchsia-700`
  - `fuchsia-800`
  - `fuchsia-900`
  - `fuchsia-background-color-default`
  - `fuchsia-visual-color`
  - `green-100`
  - `green-1000`
  - `green-200`
  - `green-300`
  - `green-400`
  - `green-500`
  - `green-600`
  - `green-700`
  - `green-800`
  - `green-900`
  - `green-background-color-default`
  - `green-visual-color`
  - `icon-color-blue-primary-default`
  - `icon-color-green-primary-default`
  - `icon-color-red-primary-default`
  - `icon-color-yellow-primary-default`
  - `indigo-1000`
  - `indigo-300`
  - `indigo-400`
  - `indigo-500`
  - `indigo-600`
  - `indigo-700`
  - `indigo-800`
  - `indigo-900`
  - `indigo-background-color-default`
  - `indigo-visual-color`
  - `informative-background-color-default`
  - `informative-background-color-down`
  - `informative-background-color-hover`
  - `informative-background-color-key-focus`
  - `informative-color-1000`
  - `informative-color-200`
  - `informative-color-300`
  - `informative-color-400`
  - `informative-color-500`
  - `informative-color-600`
  - `informative-color-700`
  - `informative-color-800`
  - `informative-color-900`
  - `informative-visual-color`
  - `magenta-100`
  - `magenta-1000`
  - `magenta-1100`
  - `magenta-1200`
  - `magenta-1300`
  - `magenta-1400`
  - `magenta-200`
  - `magenta-300`
  - `magenta-400`
  - `magenta-500`
  - `magenta-600`
  - `magenta-700`
  - `magenta-800`
  - `magenta-900`
  - `magenta-background-color-default`
  - `magenta-visual-color`
  - `negative-background-color-default`
  - `negative-background-color-down`
  - `negative-background-color-hover`
  - `negative-background-color-key-focus`
  - `negative-border-color-default`
  - `negative-border-color-focus`
  - `negative-border-color-hover`
  - `negative-border-color-key-focus`
  - `negative-color-1000`
  - `negative-color-200`
  - `negative-color-300`
  - `negative-color-400`
  - `negative-color-500`
  - `negative-color-600`
  - `negative-color-700`
  - `negative-color-800`
  - `negative-color-900`
  - `negative-content-color-default`
  - `negative-content-color-down`
  - `negative-content-color-hover`
  - `negative-content-color-key-focus`
  - `negative-visual-color`
  - `notice-background-color-default`
  - `notice-color-1000`
  - `notice-color-200`
  - `notice-color-400`
  - `notice-color-500`
  - `notice-color-600`
  - `notice-color-700`
  - `notice-color-800`
  - `notice-color-900`
  - `notice-visual-color`
  - `orange-1000`
  - `orange-200`
  - `orange-400`
  - `orange-500`
  - `orange-600`
  - `orange-700`
  - `orange-800`
  - `orange-900`
  - `orange-background-color-default`
  - `orange-visual-color`
  - `positive-background-color-default`
  - `positive-background-color-down`
  - `positive-background-color-hover`
  - `positive-background-color-key-focus`
  - `positive-color-100`
  - `positive-color-1000`
  - `positive-color-200`
  - `positive-color-300`
  - `positive-color-400`
  - `positive-color-500`
  - `positive-color-600`
  - `positive-color-700`
  - `positive-color-800`
  - `positive-color-900`
  - `positive-visual-color`
  - `purple-1000`
  - `purple-200`
  - `purple-300`
  - `purple-400`
  - `purple-500`
  - `purple-600`
  - `purple-700`
  - `purple-800`
  - `purple-900`
  - `purple-background-color-default`
  - `purple-visual-color`
  - `red-1000`
  - `red-200`
  - `red-300`
  - `red-400`
  - `red-500`
  - `red-600`
  - `red-700`
  - `red-800`
  - `red-900`
  - `red-background-color-default`
  - `red-visual-color`
  - `seafoam-100`
  - `seafoam-1000`
  - `seafoam-1100`
  - `seafoam-1200`
  - `seafoam-1300`
  - `seafoam-1400`
  - `seafoam-1500`
  - `seafoam-1600`
  - `seafoam-200`
  - `seafoam-300`
  - `seafoam-400`
  - `seafoam-500`
  - `seafoam-600`
  - `seafoam-700`
  - `seafoam-800`
  - `seafoam-900`
  - `seafoam-background-color-default`
  - `seafoam-visual-color`
  - `table-selected-row-background-color`
  - `yellow-1000`
  - `yellow-300`
  - `yellow-400`
  - `yellow-500`
  - `yellow-600`
  - `yellow-700`
  - `yellow-800`
  - `yellow-900`
  - `yellow-background-color-default`
  - `yellow-visual-color`

  </details>

### Minor Changes

- 7b5ec24: feat: add new color tokens

  ## Design Motivation

  Added new colors due to needs from Premiere Pro. The additional colors will also help when creating new data vis color palettes for Spectrum 2.

  ## Token Diff

  <details><summary><strong>Tokens added (64):</strong></summary>

  - `brown-100`
  - `brown-1000`
  - `brown-1100`
  - `brown-1200`
  - `brown-1300`
  - `brown-1400`
  - `brown-1500`
  - `brown-1600`
  - `brown-200`
  - `brown-300`
  - `brown-400`
  - `brown-500`
  - `brown-600`
  - `brown-700`
  - `brown-800`
  - `brown-900`
  - `pink-100`
  - `pink-1000`
  - `pink-1100`
  - `pink-1200`
  - `pink-1300`
  - `pink-1400`
  - `pink-1500`
  - `pink-1600`
  - `pink-200`
  - `pink-300`
  - `pink-400`
  - `pink-500`
  - `pink-600`
  - `pink-700`
  - `pink-800`
  - `pink-900`
  - `silver-100`
  - `silver-1000`
  - `silver-1100`
  - `silver-1200`
  - `silver-1300`
  - `silver-1400`
  - `silver-1500`
  - `silver-1600`
  - `silver-200`
  - `silver-300`
  - `silver-400`
  - `silver-500`
  - `silver-600`
  - `silver-700`
  - `silver-800`
  - `silver-900`
  - `turquoise-100`
  - `turquoise-1000`
  - `turquoise-1100`
  - `turquoise-1200`
  - `turquoise-1300`
  - `turquoise-1400`
  - `turquoise-1500`
  - `turquoise-1600`
  - `turquoise-200`
  - `turquoise-300`
  - `turquoise-400`
  - `turquoise-500`
  - `turquoise-600`
  - `turquoise-700`
  - `turquoise-800`
  - `turquoise-900`

  </details>

## 13.0.0-beta.4

### Major Changes

- a08dced: A handful of values transitioned from being defined per-set to being constants; set values are deprecated and root values are defined.

  ## Token Diff

  _Token values updated (5):_

  - `neutral-background-color-default`: changed from a color-set to a single value of a reference of `gray-800`
  - `neutral-background-color-down`: changed from a color-set to a single value of a reference of `gray-900`
  - `neutral-background-color-hover`: changed from a color-set to a single value of a reference of `gray-900`
  - `neutral-background-color-key-focus`: changed from a color-set to a single value of a reference of `gray-900`
  - `notice-background-color-default`: changed from a color-set to a single value of a reference of `notice-color-800`

### Patch Changes

- c0a10b4: fix: rgb used instead of rgba for a couple tokens

## 13.0.0-beta.3

### Patch Changes

- a546ef7: Returned some tokens that were removed by accident in the previous merging.

  ## Token Diff

  _Tokens added (51):_

  - `checkbox-control-size-extra-large`
  - `checkbox-control-size-large`
  - `checkbox-control-size-medium`
  - `checkbox-control-size-small`
  - `checkbox-top-to-control-extra-large`
  - `checkbox-top-to-control-large`
  - `checkbox-top-to-control-medium`
  - `checkbox-top-to-control-small`
  - `color-area-border-rounding`
  - `corner-radius-100`
  - `corner-radius-200`
  - `corner-radius-75`
  - `drop-shadow-blur`
  - `drop-shadow-x`
  - `drop-shadow-y`
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
  - `slider-handle-size-extra-large`
  - `slider-handle-size-large`
  - `slider-handle-size-medium`
  - `slider-handle-size-small`
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

## 13.0.0-beta.2

### Major Changes

- ee15851: Updated color tokens to use S2 values

  ## Design Motivation

  The S2 microsite documentation discusses changes to the [grays](https://s2.spectrum.corp.adobe.com/page/grays/) and [colors](https://s2.spectrum.corp.adobe.com/page/colors/).

  ## Token Diff

  <details><summary><strong>Tokens added (46):</strong></summary>

  - `accent-color-1500`
  - `accent-color-1600`
  - `blue-1500`
  - `blue-1600`
  - `celery-1500`
  - `celery-1600`
  - `chartreuse-1500`
  - `chartreuse-1600`
  - `cyan-1500`
  - `cyan-1600`
  - `fuchsia-1500`
  - `fuchsia-1600`
  - `gray-1000`
  - `gray-25`
  - `green-1500`
  - `green-1600`
  - `indigo-1500`
  - `indigo-1600`
  - `informative-color-1500`
  - `informative-color-1600`
  - `magenta-1500`
  - `magenta-1600`
  - `negative-color-1500`
  - `negative-color-1600`
  - `notice-color-1500`
  - `notice-color-1600`
  - `orange-1500`
  - `orange-1600`
  - `positive-color-1500`
  - `positive-color-1600`
  - `purple-1500`
  - `purple-1600`
  - `red-1500`
  - `red-1600`
  - `seafoam-1500`
  - `seafoam-1600`
  - `transparent-black-1000`
  - `transparent-black-25`
  - `transparent-black-50`
  - `transparent-black-75`
  - `transparent-white-1000`
  - `transparent-white-25`
  - `transparent-white-50`
  - `transparent-white-75`
  - `yellow-1500`
  - `yellow-1600`

  </details>

  <details><summary><strong>Token values updated (408):</strong></summary>

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
  - `background-base-color`
  - `background-layer-1-color`
  - `background-layer-2-color`
  - `blue-100`
  - `blue-1000`
  - `blue-1100`
  - `blue-1200`
  - `blue-1300`
  - `blue-1400`
  - `blue-200`
  - `blue-300`
  - `blue-400`
  - `blue-500`
  - `blue-600`
  - `blue-700`
  - `blue-800`
  - `blue-900`
  - `blue-background-color-default`
  - `blue-visual-color`
  - `body-color`
  - `card-selection-background-color`
  - `celery-100`
  - `celery-1000`
  - `celery-1100`
  - `celery-1200`
  - `celery-1300`
  - `celery-1400`
  - `celery-200`
  - `celery-300`
  - `celery-400`
  - `celery-500`
  - `celery-600`
  - `celery-700`
  - `celery-800`
  - `celery-900`
  - `celery-background-color-default`
  - `celery-visual-color`
  - `chartreuse-100`
  - `chartreuse-1000`
  - `chartreuse-1100`
  - `chartreuse-1200`
  - `chartreuse-1300`
  - `chartreuse-1400`
  - `chartreuse-200`
  - `chartreuse-300`
  - `chartreuse-400`
  - `chartreuse-500`
  - `chartreuse-600`
  - `chartreuse-700`
  - `chartreuse-800`
  - `chartreuse-900`
  - `chartreuse-background-color-default`
  - `chartreuse-visual-color`
  - `coach-mark-pagination-color`
  - `code-color`
  - `color-area-border-color`
  - `color-loupe-drop-shadow-color`
  - `color-loupe-inner-border`
  - `color-slider-border-color`
  - `cyan-100`
  - `cyan-1000`
  - `cyan-1100`
  - `cyan-1200`
  - `cyan-1300`
  - `cyan-1400`
  - `cyan-200`
  - `cyan-300`
  - `cyan-400`
  - `cyan-500`
  - `cyan-600`
  - `cyan-700`
  - `cyan-800`
  - `cyan-900`
  - `cyan-background-color-default`
  - `cyan-visual-color`
  - `detail-color`
  - `disabled-background-color`
  - `disabled-border-color`
  - `disabled-content-color`
  - `disabled-static-black-background-color`
  - `disabled-static-black-border-color`
  - `disabled-static-black-content-color`
  - `disabled-static-white-background-color`
  - `disabled-static-white-border-color`
  - `disabled-static-white-content-color`
  - `drop-zone-background-color`
  - `floating-action-button-drop-shadow-color`
  - `floating-action-button-shadow-color`
  - `focus-indicator-color`
  - `fuchsia-100`
  - `fuchsia-1000`
  - `fuchsia-1100`
  - `fuchsia-1200`
  - `fuchsia-1300`
  - `fuchsia-1400`
  - `fuchsia-200`
  - `fuchsia-300`
  - `fuchsia-400`
  - `fuchsia-500`
  - `fuchsia-600`
  - `fuchsia-700`
  - `fuchsia-800`
  - `fuchsia-900`
  - `fuchsia-background-color-default`
  - `fuchsia-visual-color`
  - `gray-100`
  - `gray-200`
  - `gray-300`
  - `gray-400`
  - `gray-50`
  - `gray-500`
  - `gray-600`
  - `gray-700`
  - `gray-75`
  - `gray-800`
  - `gray-900`
  - `gray-background-color-default`
  - `gray-visual-color`
  - `green-100`
  - `green-1000`
  - `green-1100`
  - `green-1200`
  - `green-1300`
  - `green-1400`
  - `green-200`
  - `green-300`
  - `green-400`
  - `green-500`
  - `green-600`
  - `green-700`
  - `green-800`
  - `green-900`
  - `green-background-color-default`
  - `green-visual-color`
  - `heading-color`
  - `icon-color-blue-primary-default`
  - `icon-color-green-primary-default`
  - `icon-color-inverse`
  - `icon-color-primary-default`
  - `icon-color-red-primary-default`
  - `icon-color-yellow-primary-default`
  - `indigo-100`
  - `indigo-1000`
  - `indigo-1100`
  - `indigo-1200`
  - `indigo-1300`
  - `indigo-1400`
  - `indigo-200`
  - `indigo-300`
  - `indigo-400`
  - `indigo-500`
  - `indigo-600`
  - `indigo-700`
  - `indigo-800`
  - `indigo-900`
  - `indigo-background-color-default`
  - `indigo-visual-color`
  - `informative-background-color-default`
  - `informative-background-color-down`
  - `informative-background-color-hover`
  - `informative-background-color-key-focus`
  - `informative-color-100`
  - `informative-color-1000`
  - `informative-color-1100`
  - `informative-color-1200`
  - `informative-color-1300`
  - `informative-color-1400`
  - `informative-color-200`
  - `informative-color-300`
  - `informative-color-400`
  - `informative-color-500`
  - `informative-color-600`
  - `informative-color-700`
  - `informative-color-800`
  - `informative-color-900`
  - `informative-visual-color`
  - `magenta-100`
  - `magenta-1000`
  - `magenta-1100`
  - `magenta-1200`
  - `magenta-1300`
  - `magenta-1400`
  - `magenta-200`
  - `magenta-300`
  - `magenta-400`
  - `magenta-500`
  - `magenta-600`
  - `magenta-700`
  - `magenta-800`
  - `magenta-900`
  - `magenta-background-color-default`
  - `magenta-visual-color`
  - `negative-background-color-default`
  - `negative-background-color-down`
  - `negative-background-color-hover`
  - `negative-background-color-key-focus`
  - `negative-border-color-default`
  - `negative-border-color-down`
  - `negative-border-color-focus`
  - `negative-border-color-focus-hover`
  - `negative-border-color-hover`
  - `negative-border-color-key-focus`
  - `negative-color-100`
  - `negative-color-1000`
  - `negative-color-1100`
  - `negative-color-1200`
  - `negative-color-1300`
  - `negative-color-1400`
  - `negative-color-200`
  - `negative-color-300`
  - `negative-color-400`
  - `negative-color-500`
  - `negative-color-600`
  - `negative-color-700`
  - `negative-color-800`
  - `negative-color-900`
  - `negative-content-color-default`
  - `negative-content-color-down`
  - `negative-content-color-hover`
  - `negative-content-color-key-focus`
  - `negative-visual-color`
  - `neutral-background-color-default`
  - `neutral-background-color-down`
  - `neutral-background-color-hover`
  - `neutral-background-color-key-focus`
  - `neutral-background-color-selected-default`
  - `neutral-background-color-selected-down`
  - `neutral-background-color-selected-hover`
  - `neutral-background-color-selected-key-focus`
  - `neutral-content-color-default`
  - `neutral-content-color-down`
  - `neutral-content-color-focus`
  - `neutral-content-color-focus-hover`
  - `neutral-content-color-hover`
  - `neutral-content-color-key-focus`
  - `neutral-subdued-background-color-default`
  - `neutral-subdued-background-color-down`
  - `neutral-subdued-background-color-hover`
  - `neutral-subdued-background-color-key-focus`
  - `neutral-subdued-content-color-default`
  - `neutral-subdued-content-color-down`
  - `neutral-subdued-content-color-hover`
  - `neutral-subdued-content-color-key-focus`
  - `neutral-subdued-content-color-selected`
  - `neutral-visual-color`
  - `notice-background-color-default`
  - `notice-color-100`
  - `notice-color-1000`
  - `notice-color-1100`
  - `notice-color-1200`
  - `notice-color-1300`
  - `notice-color-1400`
  - `notice-color-200`
  - `notice-color-300`
  - `notice-color-400`
  - `notice-color-500`
  - `notice-color-600`
  - `notice-color-700`
  - `notice-color-800`
  - `notice-color-900`
  - `notice-visual-color`
  - `opacity-checkerboard-square-dark`
  - `orange-100`
  - `orange-1000`
  - `orange-1100`
  - `orange-1200`
  - `orange-1300`
  - `orange-1400`
  - `orange-200`
  - `orange-300`
  - `orange-400`
  - `orange-500`
  - `orange-600`
  - `orange-700`
  - `orange-800`
  - `orange-900`
  - `orange-background-color-default`
  - `orange-visual-color`
  - `positive-background-color-default`
  - `positive-background-color-down`
  - `positive-background-color-hover`
  - `positive-background-color-key-focus`
  - `positive-color-100`
  - `positive-color-1000`
  - `positive-color-1100`
  - `positive-color-1200`
  - `positive-color-1300`
  - `positive-color-1400`
  - `positive-color-200`
  - `positive-color-300`
  - `positive-color-400`
  - `positive-color-500`
  - `positive-color-600`
  - `positive-color-700`
  - `positive-color-800`
  - `positive-color-900`
  - `positive-visual-color`
  - `purple-100`
  - `purple-1000`
  - `purple-1100`
  - `purple-1200`
  - `purple-1300`
  - `purple-1400`
  - `purple-200`
  - `purple-300`
  - `purple-400`
  - `purple-500`
  - `purple-600`
  - `purple-700`
  - `purple-800`
  - `purple-900`
  - `purple-background-color-default`
  - `purple-visual-color`
  - `red-100`
  - `red-1000`
  - `red-1100`
  - `red-1200`
  - `red-1300`
  - `red-1400`
  - `red-200`
  - `red-300`
  - `red-400`
  - `red-500`
  - `red-600`
  - `red-700`
  - `red-800`
  - `red-900`
  - `red-background-color-default`
  - `red-visual-color`
  - `seafoam-100`
  - `seafoam-1000`
  - `seafoam-1100`
  - `seafoam-1200`
  - `seafoam-1300`
  - `seafoam-1400`
  - `seafoam-200`
  - `seafoam-300`
  - `seafoam-400`
  - `seafoam-500`
  - `seafoam-600`
  - `seafoam-700`
  - `seafoam-800`
  - `seafoam-900`
  - `seafoam-background-color-default`
  - `seafoam-visual-color`
  - `swatch-border-color`
  - `table-row-hover-color`
  - `table-selected-row-background-color`
  - `table-selected-row-background-color-non-emphasized`
  - `thumbnail-border-color`
  - `transparent-black-100`
  - `transparent-black-200`
  - `transparent-black-300`
  - `transparent-black-400`
  - `transparent-black-500`
  - `transparent-black-600`
  - `transparent-black-700`
  - `transparent-black-800`
  - `transparent-black-900`
  - `transparent-white-100`
  - `transparent-white-200`
  - `transparent-white-300`
  - `transparent-white-400`
  - `transparent-white-500`
  - `transparent-white-600`
  - `transparent-white-700`
  - `transparent-white-800`
  - `transparent-white-900`
  - `yellow-100`
  - `yellow-1000`
  - `yellow-1100`
  - `yellow-1200`
  - `yellow-1300`
  - `yellow-1400`
  - `yellow-200`
  - `yellow-300`
  - `yellow-400`
  - `yellow-500`
  - `yellow-600`
  - `yellow-700`
  - `yellow-800`
  - `yellow-900`
  - `yellow-background-color-default`
  - `yellow-visual-color`

  </details>

## 13.0.0-beta.1

### Major Changes

- f1cb901: Merged dark and darkest color sets. This was done by removing `dark` and renaming `darkest` to `dark`.

  ## Design Motivation

  The S2 microsite documentation discusses the move to a [single dark theme](https://s2.spectrum.corp.adobe.com/page/grays/#a-single-dark-theme).

  ## Token Diff

  <details><summary><strong>Token values updated (358):</strong></summary>

  - `accent-background-color-default`
  - `accent-background-color-down`
  - `accent-background-color-hover`
  - `accent-background-color-key-focus`
  - `accent-visual-color`
  - `background-base-color`
  - `background-layer-1-color`
  - `background-layer-2-color`
  - `blue-100`
  - `blue-1000`
  - `blue-1100`
  - `blue-1200`
  - `blue-1300`
  - `blue-1400`
  - `blue-200`
  - `blue-300`
  - `blue-400`
  - `blue-500`
  - `blue-600`
  - `blue-700`
  - `blue-800`
  - `blue-900`
  - `blue-background-color-default`
  - `blue-visual-color`
  - `body-color`
  - `card-selection-background-color`
  - `celery-100`
  - `celery-1000`
  - `celery-1100`
  - `celery-1200`
  - `celery-1300`
  - `celery-1400`
  - `celery-200`
  - `celery-300`
  - `celery-400`
  - `celery-500`
  - `celery-600`
  - `celery-700`
  - `celery-800`
  - `celery-900`
  - `celery-background-color-default`
  - `celery-visual-color`
  - `chartreuse-100`
  - `chartreuse-1000`
  - `chartreuse-1100`
  - `chartreuse-1200`
  - `chartreuse-1300`
  - `chartreuse-1400`
  - `chartreuse-200`
  - `chartreuse-300`
  - `chartreuse-400`
  - `chartreuse-500`
  - `chartreuse-600`
  - `chartreuse-700`
  - `chartreuse-800`
  - `chartreuse-900`
  - `chartreuse-background-color-default`
  - `chartreuse-visual-color`
  - `coach-mark-pagination-color`
  - `code-color`
  - `color-area-border-color`
  - `color-slider-border-color`
  - `cyan-100`
  - `cyan-1000`
  - `cyan-1100`
  - `cyan-1200`
  - `cyan-1300`
  - `cyan-1400`
  - `cyan-200`
  - `cyan-300`
  - `cyan-400`
  - `cyan-500`
  - `cyan-600`
  - `cyan-700`
  - `cyan-800`
  - `cyan-900`
  - `cyan-background-color-default`
  - `cyan-visual-color`
  - `detail-color`
  - `disabled-background-color`
  - `disabled-border-color`
  - `disabled-content-color`
  - `drop-shadow-color`
  - `drop-zone-background-color`
  - `focus-indicator-color`
  - `fuchsia-100`
  - `fuchsia-1000`
  - `fuchsia-1100`
  - `fuchsia-1200`
  - `fuchsia-1300`
  - `fuchsia-1400`
  - `fuchsia-200`
  - `fuchsia-300`
  - `fuchsia-400`
  - `fuchsia-500`
  - `fuchsia-600`
  - `fuchsia-700`
  - `fuchsia-800`
  - `fuchsia-900`
  - `fuchsia-background-color-default`
  - `fuchsia-visual-color`
  - `gray-100`
  - `gray-200`
  - `gray-300`
  - `gray-400`
  - `gray-50`
  - `gray-500`
  - `gray-600`
  - `gray-700`
  - `gray-75`
  - `gray-800`
  - `gray-900`
  - `gray-background-color-default`
  - `gray-visual-color`
  - `green-100`
  - `green-1000`
  - `green-1100`
  - `green-1200`
  - `green-1300`
  - `green-1400`
  - `green-200`
  - `green-300`
  - `green-400`
  - `green-500`
  - `green-600`
  - `green-700`
  - `green-800`
  - `green-900`
  - `green-background-color-default`
  - `green-visual-color`
  - `heading-color`
  - `icon-color-blue-primary-default`
  - `icon-color-green-primary-default`
  - `icon-color-inverse`
  - `icon-color-primary-default`
  - `icon-color-red-primary-default`
  - `icon-color-yellow-primary-default`
  - `indigo-100`
  - `indigo-1000`
  - `indigo-1100`
  - `indigo-1200`
  - `indigo-1300`
  - `indigo-1400`
  - `indigo-200`
  - `indigo-300`
  - `indigo-400`
  - `indigo-500`
  - `indigo-600`
  - `indigo-700`
  - `indigo-800`
  - `indigo-900`
  - `indigo-background-color-default`
  - `indigo-visual-color`
  - `informative-background-color-default`
  - `informative-background-color-down`
  - `informative-background-color-hover`
  - `informative-background-color-key-focus`
  - `informative-color-100`
  - `informative-color-1000`
  - `informative-color-1100`
  - `informative-color-1200`
  - `informative-color-1300`
  - `informative-color-1400`
  - `informative-color-200`
  - `informative-color-300`
  - `informative-color-400`
  - `informative-color-500`
  - `informative-color-600`
  - `informative-color-700`
  - `informative-color-800`
  - `informative-color-900`
  - `informative-visual-color`
  - `magenta-100`
  - `magenta-1000`
  - `magenta-1100`
  - `magenta-1200`
  - `magenta-1300`
  - `magenta-1400`
  - `magenta-200`
  - `magenta-300`
  - `magenta-400`
  - `magenta-500`
  - `magenta-600`
  - `magenta-700`
  - `magenta-800`
  - `magenta-900`
  - `magenta-background-color-default`
  - `magenta-visual-color`
  - `negative-background-color-default`
  - `negative-background-color-down`
  - `negative-background-color-hover`
  - `negative-background-color-key-focus`
  - `negative-border-color-default`
  - `negative-border-color-down`
  - `negative-border-color-focus`
  - `negative-border-color-focus-hover`
  - `negative-border-color-hover`
  - `negative-border-color-key-focus`
  - `negative-color-100`
  - `negative-color-1000`
  - `negative-color-1100`
  - `negative-color-1200`
  - `negative-color-1300`
  - `negative-color-1400`
  - `negative-color-200`
  - `negative-color-300`
  - `negative-color-400`
  - `negative-color-500`
  - `negative-color-600`
  - `negative-color-700`
  - `negative-color-800`
  - `negative-color-900`
  - `negative-content-color-default`
  - `negative-content-color-down`
  - `negative-content-color-hover`
  - `negative-content-color-key-focus`
  - `negative-visual-color`
  - `neutral-background-color-default`
  - `neutral-background-color-down`
  - `neutral-background-color-hover`
  - `neutral-background-color-key-focus`
  - `neutral-content-color-default`
  - `neutral-content-color-down`
  - `neutral-content-color-focus`
  - `neutral-content-color-focus-hover`
  - `neutral-content-color-hover`
  - `neutral-content-color-key-focus`
  - `neutral-subdued-background-color-default`
  - `neutral-subdued-background-color-down`
  - `neutral-subdued-background-color-hover`
  - `neutral-subdued-background-color-key-focus`
  - `neutral-subdued-content-color-default`
  - `neutral-subdued-content-color-down`
  - `neutral-subdued-content-color-hover`
  - `neutral-subdued-content-color-key-focus`
  - `neutral-subdued-content-color-selected`
  - `neutral-visual-color`
  - `notice-background-color-default`
  - `notice-color-100`
  - `notice-color-1000`
  - `notice-color-1100`
  - `notice-color-1200`
  - `notice-color-1300`
  - `notice-color-1400`
  - `notice-color-200`
  - `notice-color-300`
  - `notice-color-400`
  - `notice-color-500`
  - `notice-color-600`
  - `notice-color-700`
  - `notice-color-800`
  - `notice-color-900`
  - `notice-visual-color`
  - `opacity-checkerboard-square-dark`
  - `orange-100`
  - `orange-1000`
  - `orange-1100`
  - `orange-1200`
  - `orange-1300`
  - `orange-1400`
  - `orange-200`
  - `orange-300`
  - `orange-400`
  - `orange-500`
  - `orange-600`
  - `orange-700`
  - `orange-800`
  - `orange-900`
  - `orange-background-color-default`
  - `orange-visual-color`
  - `overlay-opacity`
  - `positive-background-color-default`
  - `positive-background-color-down`
  - `positive-background-color-hover`
  - `positive-background-color-key-focus`
  - `positive-color-100`
  - `positive-color-1000`
  - `positive-color-1100`
  - `positive-color-1200`
  - `positive-color-1300`
  - `positive-color-1400`
  - `positive-color-200`
  - `positive-color-300`
  - `positive-color-400`
  - `positive-color-500`
  - `positive-color-600`
  - `positive-color-700`
  - `positive-color-800`
  - `positive-color-900`
  - `positive-visual-color`
  - `purple-100`
  - `purple-1000`
  - `purple-1100`
  - `purple-1200`
  - `purple-1300`
  - `purple-1400`
  - `purple-200`
  - `purple-300`
  - `purple-400`
  - `purple-500`
  - `purple-600`
  - `purple-700`
  - `purple-800`
  - `purple-900`
  - `purple-background-color-default`
  - `purple-visual-color`
  - `red-100`
  - `red-1000`
  - `red-1100`
  - `red-1200`
  - `red-1300`
  - `red-1400`
  - `red-200`
  - `red-300`
  - `red-400`
  - `red-500`
  - `red-600`
  - `red-700`
  - `red-800`
  - `red-900`
  - `red-background-color-default`
  - `red-visual-color`
  - `seafoam-100`
  - `seafoam-1000`
  - `seafoam-1100`
  - `seafoam-1200`
  - `seafoam-1300`
  - `seafoam-1400`
  - `seafoam-200`
  - `seafoam-300`
  - `seafoam-400`
  - `seafoam-500`
  - `seafoam-600`
  - `seafoam-700`
  - `seafoam-800`
  - `seafoam-900`
  - `seafoam-background-color-default`
  - `seafoam-visual-color`
  - `swatch-border-color`
  - `table-row-hover-color`
  - `table-selected-row-background-color`
  - `thumbnail-border-color`
  - `yellow-100`
  - `yellow-1000`
  - `yellow-1100`
  - `yellow-1200`
  - `yellow-1300`
  - `yellow-1400`
  - `yellow-200`
  - `yellow-300`
  - `yellow-400`
  - `yellow-500`
  - `yellow-600`
  - `yellow-700`
  - `yellow-800`
  - `yellow-900`
  - `yellow-background-color-default`
  - `yellow-visual-color`

    </details>

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
