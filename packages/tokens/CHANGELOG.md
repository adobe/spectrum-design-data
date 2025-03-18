# @adobe/spectrum-tokens

## 13.0.0

### Major Changes

GA of Spectrum 2 data. Discussions of the merge plan can be found at the following links:

    - [S2 GA release plan and S1 future support plan](https://github.com/adobe/spectrum-tokens/discussions/473)
    - [Spectrum, S2, S2-foundations updated merge plan](https://github.com/adobe/spectrum-tokens/discussions/465)
    - [Spectrum Tokens 12.x.x to Spectrum 2 migration proposal](https://github.com/adobe/spectrum-tokens/discussions/338)

#### Design Motivation

See https://s2.spectrum.adobe.com/ for more information.

Spectrum 2 is what’s next. It’s more than just a design refresh: it’s a set of adaptable resources for making experiences feel contextual, cohesive, and performant. It’s based on real-world situations. It places people’s needs first. It delivers what’s needed, when it’s needed. It’s constantly adapting. And most importantly: it belongs to everyone.

#### Token Diff

    <details><summary>Newly Deprecated (166)</summary>

    - `heading-sans-serif-light-font-weight`
    - `heading-sans-serif-light-font-style`
    - `heading-serif-light-font-weight`
    - `heading-serif-light-font-style`
    - `heading-cjk-light-font-weight`
    - `heading-cjk-light-font-style`
    - `heading-sans-serif-light-strong-font-weight`
    - `heading-sans-serif-light-strong-font-style`
    - `heading-serif-light-strong-font-weight`
    - `heading-serif-light-strong-font-style`
    - `heading-cjk-light-strong-font-weight`
    - `heading-cjk-light-strong-font-style`
    - `heading-sans-serif-light-emphasized-font-weight`
    - `heading-sans-serif-light-emphasized-font-style`
    - `heading-serif-light-emphasized-font-weight`
    - `heading-serif-light-emphasized-font-style`
    - `heading-cjk-light-emphasized-font-weight`
    - `heading-cjk-light-emphasized-font-style`
    - `heading-sans-serif-light-strong-emphasized-font-weight`
    - `heading-sans-serif-light-strong-emphasized-font-style`
    - `heading-serif-light-strong-emphasized-font-weight`
    - `heading-serif-light-strong-emphasized-font-style`
    - `heading-cjk-light-strong-emphasized-font-weight`
    - `heading-cjk-light-strong-emphasized-font-style`
    - `heading-size-xxs`
    - `heading-cjk-size-xxs`
    - `detail-sans-serif-light-font-weight`
    - `detail-sans-serif-light-font-style`
    - `detail-serif-light-font-weight`
    - `detail-serif-light-font-style`
    - `detail-cjk-light-font-weight`
    - `detail-cjk-light-font-style`
    - `detail-sans-serif-light-strong-font-weight`
    - `detail-sans-serif-light-strong-font-style`
    - `detail-serif-light-strong-font-weight`
    - `detail-serif-light-strong-font-style`
    - `detail-cjk-light-strong-font-weight`
    - `detail-cjk-light-strong-font-style`
    - `detail-sans-serif-light-emphasized-font-weight`
    - `detail-sans-serif-light-emphasized-font-style`
    - `detail-serif-light-emphasized-font-weight`
    - `detail-serif-light-emphasized-font-style`
    - `detail-cjk-light-emphasized-font-weight`
    - `detail-cjk-light-emphasized-font-style`
    - `detail-sans-serif-light-strong-emphasized-font-weight`
    - `detail-sans-serif-light-strong-emphasized-font-style`
    - `detail-serif-light-strong-emphasized-font-weight`
    - `detail-serif-light-strong-emphasized-font-style`
    - `detail-cjk-light-strong-emphasized-font-weight`
    - `detail-cjk-light-strong-emphasized-font-style`
    - `detail-letter-spacing`
    - `detail-sans-serif-text-transform`
    - `detail-serif-text-transform`
    - `negative-subdued-background-color-default`
    - `negative-subdued-background-color-hover`
    - `negative-subdued-background-color-down`
    - `negative-subdued-background-color-key-focus`
    - `drop-shadow-x`
    - `drop-shadow-y`
    - `drop-shadow-blur`
    - `field-edge-to-text-quiet`
    - `field-edge-to-border-quiet`
    - `field-edge-to-alert-icon-quiet`
    - `field-edge-to-validation-icon-quiet`
    - `field-width`: This token has been deprecated, use field-default-width-medium instead.
    - `field-width-small`: This token has been deprecated, use field-default-width-small instead.
    - `character-count-to-field-quiet-small`
    - `character-count-to-field-quiet-medium`
    - `character-count-to-field-quiet-large`
    - `character-count-to-field-quiet-extra-large`
    - `field-width-medium`: This token has been deprecated, use field-default-width-medium instead.
    - `field-width-large`: This token has been deprecated, use field-default-width-large instead.
    - `field-width-extra-large`: This token has been deprecated, use field-default-width-extra-large instead.
    - `field-label-to-component-quiet-small`
    - `field-label-to-component-quiet-medium`
    - `field-label-to-component-quiet-large`
    - `field-label-to-component-quiet-extra-large`
    - `help-text-top-to-workflow-icon-small`
    - `help-text-top-to-workflow-icon-medium`
    - `help-text-top-to-workflow-icon-large`
    - `help-text-top-to-workflow-icon-extra-large`
    - `popover-top-to-content-area`: Introduced as an error. Use popover-edge-to-content-area instead
    - `menu-item-label-to-description`
    - `slider-track-thickness`
    - `slider-control-height-small`
    - `slider-control-height-medium`
    - `slider-control-height-large`
    - `slider-control-height-extra-large`
    - `slider-handle-size-small`
    - `slider-handle-size-medium`
    - `slider-handle-size-large`
    - `slider-handle-size-extra-large`
    - `slider-handle-border-width-down-small`
    - `slider-handle-border-width-down-medium`
    - `slider-handle-border-width-down-large`
    - `slider-handle-border-width-down-extra-large`
    - `slider-handle-gap`
    - `slider-bottom-to-handle-small`
    - `slider-bottom-to-handle-medium`
    - `slider-bottom-to-handle-large`
    - `slider-bottom-to-handle-extra-large`
    - `combo-box-quiet-minimum-width-multiplier`
    - `combo-box-visual-to-field-button-small`: Replaced with combo-box-visual-to-field-button
    - `combo-box-visual-to-field-button-medium`: Replaced with combo-box-visual-to-field-button
    - `combo-box-visual-to-field-button-large`: Replaced with combo-box-visual-to-field-button
    - `combo-box-visual-to-field-button-extra-large`: Replaced with combo-box-visual-to-field-button
    - `combo-box-visual-to-field-button-quiet`: Replaced with combo-box-visual-to-field-button
    - `alert-dialog-title-size`: Replace with alert-dialog-title-font-size
    - `alert-dialog-description-size`: Replace with alert-dialog-description-font-size
    - `opacity-checkerboard-square-size`: This token has been deprecated, use opacity-checkerboard-square-size-medium instead.
    - `contextual-help-title-size`
    - `contextual-help-body-size`
    - `breadcrumbs-height`
    - `breadcrumbs-height-compact`
    - `breadcrumbs-top-to-text`
    - `breadcrumbs-top-to-text-compact`
    - `breadcrumbs-bottom-to-text`
    - `breadcrumbs-bottom-to-text-compact`
    - `breadcrumbs-start-edge-to-text`: Use a sized token instead, e.g., breadcrumbs-start-edge-to-text-large.
    - `breadcrumbs-top-to-separator-icon`: Use a sized token instead, e.g., breadcrumbs-top-to-separator-large.
    - `breadcrumbs-top-to-separator-icon-compact`: Use a sized token instead, e.g., breadcrumbs-top-to-separator-medium.
    - `breadcrumbs-top-to-separator-icon-multiline`
    - `breadcrumbs-separator-icon-to-bottom-text-multiline`
    - `breadcrumbs-truncated-menu-to-separator-icon`
    - `breadcrumbs-top-to-truncated-menu-compact`
    - `rating-indicator-width`
    - `rating-indicator-to-icon`
    - `illustrated-message-maximum-width`
    - `illustrated-message-title-size`: Use illustrated-message-medium-title-font-size instead
    - `illustrated-message-cjk-title-size`: Use illustrated-message-medium-cjk-title-font-size instead
    - `illustrated-message-body-size`: Use illustrated-message-medium-body-font-size instead
    - `drop-zone-title-size`: Use drop-zone-title-font-size instead
    - `drop-zone-cjk-title-size`: Use drop-zone-cjk-title-font-size instead
    - `drop-zone-body-size`: Use drop-zone-body-font-size instead
    - `coach-mark-title-size`: Replace with coach-mark-title-font-size
    - `coach-mark-body-size`: Replace with coach-mark-body-font-size
    - `coach-mark-pagination-body-size`: Replace with coach-mark-pagination-body-font-size
    - `accordion-disclosure-indicator-to-text`
    - `accordion-edge-to-disclosure-indicator`
    - `table-row-height-small-regular`: This token has been deprecated, use table-row-height-small instead.
    - `table-row-height-medium-regular`: This token has been deprecated, use table-row-height-medium instead.
    - `table-row-height-large-regular`: This token has been deprecated, use table-row-height-large instead.
    - `table-row-height-extra-large-regular`: This token has been deprecated, use table-row-height-extra-large instead.
    - `table-row-top-to-text-small-regular`: This token has been deprecated, use table-row-top-to-text-small instead.
    - `table-row-top-to-text-medium-regular`: This token has been deprecated, use table-row-top-to-text-medium instead.
    - `table-row-top-to-text-large-regular`: This token has been deprecated, use table-row-top-to-text-large instead.
    - `table-row-top-to-text-extra-large-regular`: This token has been deprecated, use table-row-top-to-text-extra-large instead.
    - `table-row-bottom-to-text-small-regular`: This token has been deprecated, use table-row-bottom-to-text-small instead.
    - `table-row-bottom-to-text-medium-regular`: This token has been deprecated, use table-row-bottom-to-text-medium instead.
    - `table-row-bottom-to-text-large-regular`: This token has been deprecated, use table-row-bottom-to-text-large instead.
    - `table-row-bottom-to-text-extra-large-regular`: This token has been deprecated, use table-row-bottom-to-text-extra-large instead.
    - `table-row-checkbox-to-top-small-regular`: This token has been deprecated, use table-row-checkbox-to-top-small instead.
    - `table-row-checkbox-to-top-medium-regular`: This token has been deprecated, use table-row-checkbox-to-top-medium instead.
    - `table-row-checkbox-to-top-large-regular`: This token has been deprecated, use table-row-checkbox-to-top-large instead.
    - `table-row-checkbox-to-top-extra-large-regular`: This token has been deprecated, use table-row-checkbox-to-top-extra-large instead.
    - `table-thumbnail-to-top-minimum-small-regular`: This token has been deprecated, use table-thumbnail-to-top-minimum-small instead.
    - `table-thumbnail-to-top-minimum-medium-regular`: This token has been deprecated, use table-thumbnail-to-top-minimum-medium instead.
    - `table-thumbnail-to-top-minimum-large-regular`: This token has been deprecated, use table-thumbnail-to-top-minimum-large instead.
    - `table-thumbnail-to-top-minimum-extra-large-regular`: This token has been deprecated, use table-thumbnail-to-top-minimum-extra-large instead.
    - `in-field-button-edge-to-fill`
    - `tag-minimum-width-multiplier`
    - `icon-color-inverse`
    - `color-loupe-drop-shadow-color`: Use `drop-shadow-elevated-color` instead
    - `color-loupe-drop-shadow-y`
    - `color-loupe-drop-shadow-blur`
    - `drop-shadow-color`: Replaced with drop-shadow-color-100

    </details>
    <details><summary>Newly "Un-deprecated" (8)</summary>

    - `slider-control-height-small`
    - `slider-control-height-medium`
    - `slider-control-height-large`
    - `slider-control-height-extra-large`
    - `slider-bottom-to-handle-small`
    - `slider-bottom-to-handle-medium`
    - `slider-bottom-to-handle-large`
    - `slider-bottom-to-handle-extra-large`

    </details>
    <details><summary>Added (665)</summary>

    - `text-align-start`
    - `text-align-center`
    - `text-align-end`
    - `font-size-1400`
    - `font-size-1500`
    - `heading-cjk-size-xxxxl`
    - `heading-size-xxxxl`
    - `body-size-xxs`
    - `body-cjk-size-xxs`
    - `detail-cjk-size-xs`
    - `detail-size-xs`
    - `accent-color-1500`
    - `accent-color-1600`
    - `informative-color-1500`
    - `informative-color-1600`
    - `negative-color-1500`
    - `negative-color-1600`
    - `notice-color-1500`
    - `notice-color-1600`
    - `positive-color-1500`
    - `positive-color-1600`
    - `informative-subtle-background-color-default`
    - `positive-subtle-background-color-default`
    - `notice-subtle-background-color-default`
    - `negative-subtle-background-color-default`
    - `icon-color-informative`
    - `icon-color-neutral`
    - `icon-color-positive`
    - `icon-color-notice`
    - `icon-color-negative`
    - `accent-subtle-background-color-default`
    - `corner-radius-0`
    - `corner-radius-300`
    - `corner-radius-400`
    - `corner-radius-500`
    - `corner-radius-600`
    - `corner-radius-700`
    - `corner-radius-800`
    - `corner-radius-1000`
    - `text-to-visual-400`
    - `text-to-control-50`
    - `side-focus-indicator`
    - `component-size-width-ratio-down`
    - `component-size-minimum-perspective-down`
    - `component-size-difference-down`
    - `corner-radius-none`
    - `corner-radius-small-default`
    - `corner-radius-medium-default`
    - `corner-radius-large-default`
    - `corner-radius-extra-large-default`
    - `corner-radius-full`
    - `corner-radius-small-size-small`
    - `corner-radius-small-size-medium`
    - `corner-radius-small-size-large`
    - `corner-radius-small-size-extra-large`
    - `corner-radius-medium-size-extra-small`
    - `corner-radius-medium-size-small`
    - `corner-radius-medium-size-medium`
    - `corner-radius-medium-size-large`
    - `corner-radius-medium-size-extra-large`
    - `drop-shadow-x-100`
    - `drop-shadow-x-200`
    - `drop-shadow-x-300`
    - `drop-shadow-y-100`
    - `drop-shadow-y-200`
    - `drop-shadow-y-300`
    - `drop-shadow-blur-100`
    - `drop-shadow-blur-200`
    - `drop-shadow-blur-300`
    - `drop-shadow-emphasized-default-x`
    - `drop-shadow-emphasized-default-y`
    - `drop-shadow-emphasized-default-blur`
    - `drop-shadow-emphasized-hover-x`
    - `drop-shadow-emphasized-hover-y`
    - `drop-shadow-emphasized-hover-blur`
    - `drop-shadow-elevated-x`
    - `drop-shadow-elevated-y`
    - `drop-shadow-elevated-blur`
    - `drop-shadow-dragged-x`
    - `drop-shadow-dragged-y`
    - `drop-shadow-dragged-blur`
    - `gradient-stop-1-genai`
    - `gradient-stop-2-genai`
    - `gradient-stop-3-genai`
    - `gradient-stop-1-premium`
    - `gradient-stop-2-premium`
    - `gradient-stop-3-premium`
    - `window-to-edge`
    - `component-size-maximum-perspective-down`
    - `popover-edge-to-content-area`
    - `opacity-checkerboard-square-size-medium`
    - `avatar-size-800`
    - `avatar-size-900`
    - `avatar-size-1000`
    - `avatar-size-1100`
    - `avatar-size-1200`
    - `avatar-size-1300`
    - `avatar-size-1400`
    - `avatar-size-1500`
    - `table-row-height-small`
    - `table-row-height-medium`
    - `table-row-height-large`
    - `table-row-height-extra-large`
    - `table-row-top-to-text-small`
    - `table-row-top-to-text-medium`
    - `table-row-top-to-text-large`
    - `table-row-top-to-text-extra-large`
    - `table-row-bottom-to-text-small`
    - `table-row-bottom-to-text-medium`
    - `table-row-bottom-to-text-large`
    - `table-row-bottom-to-text-extra-large`
    - `table-row-checkbox-to-top-small`
    - `table-row-checkbox-to-top-medium`
    - `table-row-checkbox-to-top-large`
    - `table-row-checkbox-to-top-extra-large`
    - `table-thumbnail-to-top-minimum-small`
    - `table-thumbnail-to-top-minimum-medium`
    - `table-thumbnail-to-top-minimum-large`
    - `table-thumbnail-to-top-minimum-extra-large`
    - `divider-vertical-minimum-height`
    - `divider-horizontal-minimum-width`
    - `tooltip-tip-corner-radius`
    - `switch-handle-size-small`
    - `switch-handle-selected-size-small`
    - `switch-handle-selected-size-medium`
    - `switch-handle-selected-size-large`
    - `switch-handle-selected-size-extra-large`
    - `switch-handle-size-medium`
    - `switch-handle-size-large`
    - `switch-handle-size-extra-large`
    - `tag-maximum-width-multiplier`
    - `tag-label-to-clear-icon-small`
    - `tag-label-to-clear-icon-medium`
    - `tag-label-to-clear-icon-large`
    - `tag-edge-to-clear-icon-small`
    - `tag-edge-to-clear-icon-medium`
    - `tag-edge-to-clear-icon-large`
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
    - `opacity-checkerboard-square-size-small`
    - `alert-banner-top-to-alert-icon`
    - `field-default-width-small`
    - `field-default-width-medium`
    - `field-default-width-large`
    - `field-default-width-extra-large`
    - `tag-minimum-width-small`
    - `tag-minimum-width-medium`
    - `tag-minimum-width-large`
    - `combo-box-visual-to-field-button`
    - `in-field-button-edge-to-fill-small`
    - `in-field-button-edge-to-fill-medium`
    - `in-field-button-edge-to-fill-large`
    - `in-field-button-edge-to-fill-extra-large`
    - `in-field-progress-circle-edge-to-fill`
    - `in-field-progress-circle-size-75`
    - `in-field-progress-circle-size-100`
    - `in-field-progress-circle-size-200`
    - `in-field-progress-circle-size-300`
    - `alert-dialog-description-font-size`
    - `alert-dialog-title-font-size`
    - `coach-mark-body-font-size`
    - `coach-mark-pagination-body-font-size`
    - `coach-mark-title-font-size`
    - `standard-dialog-title-font-size`
    - `standard-dialog-body-font-size`
    - `standard-dialog-maximum-width-small`
    - `standard-dialog-minimum-width`
    - `standard-dialog-maximum-width-medium`
    - `standard-dialog-maximum-width-large`
    - `status-light-text-to-visual-75`
    - `status-light-text-to-visual-100`
    - `status-light-text-to-visual-200`
    - `status-light-text-to-visual-300`
    - `link-out-icon-size-75`
    - `link-out-icon-size-100`
    - `link-out-icon-size-200`
    - `menu-item-label-to-description-small`
    - `menu-item-label-to-description-medium`
    - `menu-item-label-to-description-large`
    - `menu-item-label-to-description-extra-large`
    - `menu-section-header-to-description-small`
    - `menu-section-header-to-description-medium`
    - `menu-section-header-to-description-large`
    - `menu-section-header-to-description-extra-large`
    - `menu-item-top-to-thumbnail-small`
    - `menu-item-top-to-thumbnail-medium`
    - `menu-item-top-to-thumbnail-large`
    - `menu-item-top-to-thumbnail-extra-large`
    - `menu-item-background-opacity`
    - `illustrated-message-small-title-font-size`
    - `illustrated-message-small-cjk-title-font-size`
    - `illustrated-message-medium-title-font-size`
    - `illustrated-message-medium-cjk-title-font-size`
    - `illustrated-message-large-title-font-size`
    - `illustrated-message-large-cjk-title-font-size`
    - `illustrated-message-small-body-font-size`
    - `illustrated-message-medium-body-font-size`
    - `illustrated-message-large-body-font-size`
    - `drop-zone-title-font-size`
    - `drop-zone-cjk-title-font-size`
    - `drop-zone-body-font-size`
    - `breadcrumbs-separator-to-bottom-text-multiline`
    - `breadcrumbs-start-edge-to-text-large`
    - `breadcrumbs-start-edge-to-text-medium`
    - `breadcrumbs-start-edge-to-text-multiline`
    - `breadcrumbs-top-to-separator-large`
    - `breadcrumbs-top-to-separator-medium`
    - `breadcrumbs-top-to-separator-multiline`
    - `breadcrumbs-truncated-menu-to-separator`
    - `breadcrumbs-text-to-separator-large`
    - `breadcrumbs-text-to-separator-medium`
    - `breadcrumbs-text-to-separator-multiline`
    - `contextual-help-body-font-size`
    - `contextual-help-title-font-size`
    - `coach-indicator-collapsed-ring-rounding-increment`
    - `coach-indicator-expanded-ring-rounding-increment`
    - `coach-indicator-collapsed-ring-thickness`
    - `coach-indicator-expanded-ring-thickness`
    - `coach-indicator-collapsed-gap`
    - `coach-indicator-expanded-gap`
    - `coach-indicator-opacity`
    - `accordion-content-area-edge-to-content-small`
    - `accordion-content-area-edge-to-content-medium`
    - `accordion-content-area-edge-to-content-large`
    - `accordion-content-area-edge-to-content-extra-large`
    - `accordion-disclosure-indicator-to-text-small`
    - `accordion-disclosure-indicator-to-text-medium`
    - `accordion-disclosure-indicator-to-text-large`
    - `accordion-disclosure-indicator-to-text-extra-large`
    - `accordion-item-to-divider`
    - `meter-thickness-medium`
    - `meter-thickness-extra-large`
    - `thumbnail-opacity-checkerboard-square-size`
    - `thumbnail-corner-radius`
    - `action-bar-top-to-content-area`
    - `action-bar-bottom-to-content-area`
    - `action-bar-edge-to-content-area`
    - `action-bar-close-button-to-counter`
    - `action-bar-counter-font-size`
    - `swatch-group-spacing-spacious`
    - `swatch-group-border-opacity`
    - `avatar-border-width`
    - `avatar-group-size-50`
    - `avatar-group-size-75`
    - `avatar-group-size-100`
    - `avatar-group-size-200`
    - `avatar-group-size-300`
    - `avatar-group-size-400`
    - `avatar-group-size-500`
    - `avatar-to-avatar-50`
    - `avatar-to-avatar-75`
    - `avatar-to-avatar-100`
    - `avatar-to-avatar-200`
    - `avatar-to-avatar-300`
    - `avatar-to-avatar-400`
    - `avatar-to-avatar-500`
    - `code-cjk-size-xl`
    - `code-cjk-size-l`
    - `code-cjk-size-m`
    - `code-cjk-size-s`
    - `code-cjk-size-xs`
    - `standard-panel-width`
    - `standard-panel-minimum-width`
    - `standard-panel-maximum-width`
    - `standard-panel-top-to-close-button-compact`
    - `standard-panel-top-to-close-button-regular`
    - `standard-panel-top-to-close-button-spacious`
    - `standard-panel-edge-to-close-button-compact`
    - `standard-panel-edge-to-close-button-regular`
    - `standard-panel-edge-to-close-button-spacious`
    - `standard-panel-title-font-size`
    - `illustrated-message-horizontal-maximum-width`
    - `illustrated-message-vertical-maximum-width`
    - `bar-panel-width`
    - `bar-panel-minimum-width`
    - `bar-panel-maximum-width`
    - `bar-panel-spacing-extra-spacious`
    - `rating-top-to-content-area-small`
    - `rating-bottom-to-content-area-small`
    - `rating-edge-to-content-area-small`
    - `rating-top-to-content-area-medium`
    - `rating-bottom-to-content-area-medium`
    - `rating-edge-to-content-area-medium`
    - `rating-width-small`
    - `rating-height-small`
    - `rating-width-medium`
    - `rating-height-medium`
    - `select-box-horizontal-minimum-height`
    - `select-box-horizontal-width`
    - `select-box-vertical-height`
    - `select-box-edge-to-checkbox`
    - `select-box-horizontal-end-to-content`
    - `select-box-horizontal-illustration-to-label`
    - `select-box-horizontal-label-to-description`
    - `select-box-horizontal-start-to-content`
    - `select-box-horizontal-top-to-content`
    - `select-box-top-to-checkbox`
    - `select-box-vertical-edge-to-content`
    - `select-box-vertical-illustration-to-label`
    - `slider-control-to-field-label-editable-small`
    - `slider-control-to-field-label-editable-medium`
    - `slider-control-to-field-label-editable-large`
    - `slider-control-to-field-label-editable-extra-large`
    - `slider-control-to-field-label-side-small`
    - `slider-control-to-field-label-side-medium`
    - `slider-control-to-field-label-side-large`
    - `slider-control-to-field-label-side-extra-large`
    - `slider-control-to-text-field-small`
    - `slider-control-to-text-field-medium`
    - `slider-control-to-text-field-large`
    - `slider-control-to-text-field-extra-large`
    - `segmented-control-selection-border-width`
    - `slider-handle-height-precision-small`
    - `slider-handle-height-precision-medium`
    - `slider-handle-height-precision-large`
    - `slider-handle-height-precision-extra-large`
    - `slider-handle-small`
    - `slider-handle-medium`
    - `slider-handle-large`
    - `slider-handle-extra-large`
    - `slider-handle-precision-width`
    - `slider-track-height-medium`
    - `slider-track-height-large`
    - `segmented-control-item-height`
    - `in-field-stepper-to-end-small`
    - `in-field-stepper-to-end-medium`
    - `in-field-stepper-to-end-large`
    - `in-field-stepper-to-end-extra-large`
    - `number-field-with-stepper-minimum-width-small`
    - `number-field-with-stepper-minimum-width-medium`
    - `number-field-with-stepper-minimum-width-large`
    - `number-field-with-stepper-minimum-width-extra-large`
    - `number-field-visual-to-in-field-stepper-small`
    - `number-field-visual-to-in-field-stepper-medium`
    - `number-field-visual-to-in-field-stepper-large`
    - `number-field-visual-to-in-field-stepper-extra-large`
    - `number-field-minimum-width-multiplier`
    - `takeover-dialog-height`
    - `takeover-dialog-width`
    - `tree-view-disclosure-indicator-height`
    - `tree-view-disclosure-indicator-width`
    - `tree-view-minimum-height`
    - `tree-view-minimum-width`
    - `tree-view-bottom-to-label`
    - `tree-view-drag-handle-to-checkbox`
    - `tree-view-edge-to-checkbox`
    - `tree-view-edge-to-drag-handle`
    - `tree-view-end-edge-to-action-area`
    - `tree-view-header-to-item`
    - `tree-view-item-to-header`
    - `tree-view-item-to-item`
    - `tree-view-item-to-item-detached`
    - `tree-view-label-to-action-area`
    - `tree-view-level-increment`
    - `tree-view-minimum-top-to-context-area`
    - `tree-view-top-to-action-button`
    - `tree-view-top-to-checkbox`
    - `tree-view-top-to-disclosure-indicator`
    - `tree-view-top-to-drag-handle`
    - `tree-view-top-to-label`
    - `tree-view-selected-row-background-opacity-emphasized`
    - `tree-view-selected-row-background-opacity-emphasized-hover`
    - `action-bar-minimum-width`
    - `action-bar-label-to-action-group-area`
    - `icon-color-primary-hover`
    - `icon-color-primary-down`
    - `icon-color-blue-primary-hover`
    - `icon-color-blue-primary-down`
    - `icon-color-brown-primary-default`
    - `icon-color-brown-primary-hover`
    - `icon-color-brown-primary-down`
    - `icon-color-celery-primary-default`
    - `icon-color-celery-primary-hover`
    - `icon-color-celery-primary-down`
    - `icon-color-chartreuse-primary-default`
    - `icon-color-chartreuse-primary-hover`
    - `icon-color-chartreuse-primary-down`
    - `icon-color-cinnamon-primary-default`
    - `icon-color-cinnamon-primary-hover`
    - `icon-color-cinnamon-primary-down`
    - `icon-color-cyan-primary-default`
    - `icon-color-cyan-primary-hover`
    - `icon-color-cyan-primary-down`
    - `icon-color-fuchsia-primary-default`
    - `icon-color-fuchsia-primary-hover`
    - `icon-color-fuchsia-primary-down`
    - `icon-color-green-primary-hover`
    - `icon-color-green-primary-down`
    - `icon-color-indigo-primary-default`
    - `icon-color-indigo-primary-hover`
    - `icon-color-indigo-primary-down`
    - `icon-color-magenta-primary-default`
    - `icon-color-magenta-primary-hover`
    - `icon-color-magenta-primary-down`
    - `icon-color-orange-primary-default`
    - `icon-color-orange-primary-hover`
    - `icon-color-orange-primary-down`
    - `icon-color-pink-primary-default`
    - `icon-color-pink-primary-hover`
    - `icon-color-pink-primary-down`
    - `icon-color-purple-primary-default`
    - `icon-color-purple-primary-hover`
    - `icon-color-purple-primary-down`
    - `icon-color-red-primary-hover`
    - `icon-color-red-primary-down`
    - `icon-color-seafoam-primary-default`
    - `icon-color-seafoam-primary-hover`
    - `icon-color-seafoam-primary-down`
    - `icon-color-silver-primary-default`
    - `icon-color-silver-primary-hover`
    - `icon-color-silver-primary-down`
    - `icon-color-turquoise-primary-default`
    - `icon-color-turquoise-primary-hover`
    - `icon-color-turquoise-primary-down`
    - `icon-color-yellow-primary-hover`
    - `icon-color-yellow-primary-down`
    - `icon-color-disabled-primary`
    - `icon-color-blue-background`
    - `icon-color-brown-background`
    - `icon-color-celery-background`
    - `icon-color-chartreuse-background`
    - `icon-color-cinnamon-background`
    - `icon-color-cyan-background`
    - `icon-color-fuchsia-background`
    - `icon-color-green-background`
    - `icon-color-indigo-background`
    - `icon-color-magenta-background`
    - `icon-color-orange-background`
    - `icon-color-pink-background`
    - `icon-color-purple-background`
    - `icon-color-red-background`
    - `icon-color-seafoam-background`
    - `icon-color-silver-background`
    - `icon-color-turquoise-background`
    - `icon-color-yellow-background`
    - `icon-color-inverse-background`
    - `icon-color-emphasized-background`
    - `transparent-white-25`
    - `transparent-white-50`
    - `transparent-white-75`
    - `transparent-white-1000`
    - `transparent-black-25`
    - `transparent-black-50`
    - `transparent-black-75`
    - `transparent-black-1000`
    - `gray-25`
    - `gray-1000`
    - `blue-1500`
    - `blue-1600`
    - `red-1500`
    - `red-1600`
    - `orange-1500`
    - `orange-1600`
    - `yellow-1500`
    - `yellow-1600`
    - `chartreuse-1500`
    - `chartreuse-1600`
    - `celery-1500`
    - `celery-1600`
    - `green-1500`
    - `green-1600`
    - `seafoam-1500`
    - `seafoam-1600`
    - `cyan-1500`
    - `cyan-1600`
    - `indigo-1500`
    - `indigo-1600`
    - `purple-1500`
    - `purple-1600`
    - `fuchsia-1500`
    - `fuchsia-1600`
    - `magenta-1500`
    - `magenta-1600`
    - `pink-100`
    - `pink-200`
    - `pink-300`
    - `pink-400`
    - `pink-500`
    - `pink-600`
    - `pink-700`
    - `pink-800`
    - `pink-900`
    - `pink-1000`
    - `pink-1100`
    - `pink-1200`
    - `pink-1300`
    - `pink-1400`
    - `pink-1500`
    - `pink-1600`
    - `turquoise-100`
    - `turquoise-200`
    - `turquoise-300`
    - `turquoise-400`
    - `turquoise-500`
    - `turquoise-600`
    - `turquoise-700`
    - `turquoise-800`
    - `turquoise-900`
    - `turquoise-1000`
    - `turquoise-1100`
    - `turquoise-1200`
    - `turquoise-1300`
    - `turquoise-1400`
    - `turquoise-1500`
    - `turquoise-1600`
    - `brown-100`
    - `brown-200`
    - `brown-300`
    - `brown-400`
    - `brown-500`
    - `brown-600`
    - `brown-700`
    - `brown-800`
    - `brown-900`
    - `brown-1000`
    - `brown-1100`
    - `brown-1200`
    - `brown-1300`
    - `brown-1400`
    - `brown-1500`
    - `brown-1600`
    - `silver-100`
    - `silver-200`
    - `silver-300`
    - `silver-400`
    - `silver-500`
    - `silver-600`
    - `silver-700`
    - `silver-800`
    - `silver-900`
    - `silver-1000`
    - `silver-1100`
    - `silver-1200`
    - `silver-1300`
    - `silver-1400`
    - `silver-1500`
    - `silver-1600`
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
    - `menu-item-background-color-default`
    - `menu-item-background-color-hover`
    - `menu-item-background-color-down`
    - `menu-item-background-color-keyboard-focus`
    - `menu-item-background-color-disabled`
    - `popover-border-color`
    - `popover-border-opacity`
    - `coach-indicator-color`
    - `swatch-group-border-color`
    - `avatar-border-color`
    - `standard-panel-gripper-color-drag`
    - `standard-panel-gripper-color`
    - `bar-panel-gripper-color`
    - `bar-panel-gripper-color-drag`
    - `select-box-selected-border-color`
    - `tree-view-row-background-hover`
    - `tree-view-selected-row-background-color-emphasized`
    - `tree-view-selected-row-background-default`
    - `tree-view-selected-row-background-hover`
    - `color-wheel-border-color`
    - `color-wheel-border-opacity`
    - `action-bar-border-color`
    - `background-elevated-color`
    - `background-pasteboard-color`
    - `brown-visual-color`
    - `cinnamon-visual-color`
    - `pink-visual-color`
    - `silver-visual-color`
    - `turquoise-visual-color`
    - `brown-background-color-default`
    - `cinnamon-background-color-default`
    - `pink-background-color-default`
    - `silver-background-color-default`
    - `turquoise-background-color-default`
    - `title-color`
    - `drop-shadow-color-100`
    - `drop-shadow-color-200`
    - `drop-shadow-color-300`
    - `drop-shadow-emphasized-default-color`
    - `drop-shadow-emphasized-hover-color`
    - `drop-shadow-elevated-color`
    - `neutral-subtle-background-color-default`
    - `static-black-text-color`
    - `static-white-text-color`
    - `track-color`
    - `static-black-track-color`
    - `static-white-track-color`
    - `static-black-track-indicator-color`
    - `static-white-track-indicator-color`
    - `drop-shadow-dragged-color`
    - `gray-subtle-background-color-default`
    - `blue-subtle-background-color-default`
    - `green-subtle-background-color-default`
    - `orange-subtle-background-color-default`
    - `red-subtle-background-color-default`
    - `brown-subtle-background-color-default`
    - `cinnamon-subtle-background-color-default`
    - `celery-subtle-background-color-default`
    - `chartreuse-subtle-background-color-default`
    - `cyan-subtle-background-color-default`
    - `fuchsia-subtle-background-color-default`
    - `indigo-subtle-background-color-default`
    - `magenta-subtle-background-color-default`
    - `pink-subtle-background-color-default`
    - `purple-subtle-background-color-default`
    - `seafoam-subtle-background-color-default`
    - `silver-subtle-background-color-default`
    - `turquoise-subtle-background-color-default`
    - `yellow-subtle-background-color-default`

    </details>

    Updated (1592)

    <details><summary>Added Properties (84)</summary>

    - `heading-sans-serif-font-weight`
        - value: extra-bold-font-weight
    - `heading-serif-font-weight`
        - value: bold-font-weight
    - `heading-cjk-font-weight`
        - value: extra-bold-font-weight
    - `heading-sans-serif-emphasized-font-weight`
        - value: extra-bold-font-weight
    - `heading-serif-emphasized-font-weight`
        - value: bold-font-weight
    - `accent-color-100`
        - value: blue-100
    - `accent-color-200`
        - value: blue-200
    - `accent-color-300`
        - value: blue-300
    - `accent-color-400`
        - value: blue-400
    - `accent-color-500`
        - value: blue-500
    - `accent-color-600`
        - value: blue-600
    - `accent-color-700`
        - value: blue-700
    - `accent-color-800`
        - value: blue-800
    - `accent-color-900`
        - value: blue-900
    - `accent-color-1000`
        - value: blue-1000
    - `accent-color-1100`
        - value: blue-1100
    - `accent-color-1200`
        - value: blue-1200
    - `accent-color-1300`
        - value: blue-1300
    - `accent-color-1400`
        - value: blue-1400
    - `corner-radius-75`
        - value: 3px
    - `corner-radius-100`
        - value: 4px
    - `corner-radius-200`
        - value: 5px
    - `border-width-100`
        - value: 1px
    - `side-label-character-count-top-margin-small`
        - value: 0px
    - `side-label-character-count-top-margin-medium`
        - value: 0px
    - `side-label-character-count-top-margin-large`
        - value: 0px
    - `side-label-character-count-top-margin-extra-large`
        - value: 0px
    - `checkbox-control-size-small`
        - desktop.schema: dimension.json
        - desktop.value: 14px
        - desktop.uuid: 460e8170-de69-4f8e-8420-6c87a1f6f5cd
        - mobile.schema: dimension.json
        - mobile.value: 18px
        - mobile.uuid: af31c1a5-ffce-4a54-8862-3e711ca53d25
    - `checkbox-control-size-medium`
        - desktop.schema: dimension.json
        - desktop.value: 16px
        - desktop.uuid: 86288454-7192-4e4c-b55f-fc509fc58c01
        - mobile.schema: dimension.json
        - mobile.value: 20px
        - mobile.uuid: 00fee3f7-a743-45d6-a2b6-028d5d96964a
    - `checkbox-control-size-large`
        - desktop.schema: dimension.json
        - desktop.value: 18px
        - desktop.uuid: 839a52bc-b9ee-473f-acde-0799b4f55ded
        - mobile.schema: dimension.json
        - mobile.value: 22px
        - mobile.uuid: b4367578-989e-438d-9a3e-7cb077f2f7c9
    - `checkbox-control-size-extra-large`
        - desktop.schema: dimension.json
        - desktop.value: 20px
        - desktop.uuid: 4ba47ba1-c9bd-447e-8948-009d5b424e0d
        - mobile.schema: dimension.json
        - mobile.value: 26px
        - mobile.uuid: 13093f8b-e38e-449f-a982-7f960bb84dfa
    - `checkbox-top-to-control-small`
        - desktop.schema: dimension.json
        - desktop.value: 5px
        - desktop.uuid: 20518175-5bc7-4659-8007-e74339c39433
        - mobile.schema: dimension.json
        - mobile.value: 6px
        - mobile.uuid: f254146e-f469-44b1-b0c9-1ac72e88f9e3
    - `checkbox-top-to-control-medium`
        - desktop.schema: dimension.json
        - desktop.value: 8px
        - desktop.uuid: dcde5d2d-60f8-4d56-bfb1-bba44a087515
        - mobile.schema: dimension.json
        - mobile.value: 10px
        - mobile.uuid: e3751526-2db9-421c-85f9-d60071aac49b
    - `checkbox-top-to-control-large`
        - desktop.schema: dimension.json
        - desktop.value: 11px
        - desktop.uuid: 93edae08-5320-4e7e-a006-a9af1d3665ad
        - mobile.schema: dimension.json
        - mobile.value: 14px
        - mobile.uuid: d040d2f4-9bb4-4d27-adac-40fef079d958
    - `checkbox-top-to-control-extra-large`
        - desktop.schema: dimension.json
        - desktop.value: 14px
        - desktop.uuid: 3c4217bb-91f2-4347-9f65-a0528992f600
        - mobile.schema: dimension.json
        - mobile.value: 17px
        - mobile.uuid: b3be5ac8-2415-4490-8b4a-c08661ec84d1
    - `switch-control-width-small`
        - desktop.schema: dimension.json
        - desktop.value: 22px
        - desktop.uuid: f4d6fe1a-70bd-473a-9fa5-477865ea898e
        - mobile.schema: dimension.json
        - mobile.value: 30px
        - mobile.uuid: ca939c4d-9369-498c-81cb-61df1397f657
    - `switch-control-width-medium`
        - desktop.schema: dimension.json
        - desktop.value: 26px
        - desktop.uuid: d329eda6-f13d-4a44-b962-ff06c371ed93
        - mobile.schema: dimension.json
        - mobile.value: 34px
        - mobile.uuid: ec2f3b6b-80db-4c43-bdd2-caee98796775
    - `switch-control-width-large`
        - desktop.schema: dimension.json
        - desktop.value: 30px
        - desktop.uuid: cef839a5-2ba7-4e47-9a85-d94260a8ff10
        - mobile.schema: dimension.json
        - mobile.value: 38px
        - mobile.uuid: 5c7bdcc9-63f8-4c4b-b26f-97b39f53dbea
    - `switch-control-width-extra-large`
        - desktop.schema: dimension.json
        - desktop.value: 34px
        - desktop.uuid: f3102afd-e5df-4912-9203-8226ce37fed5
        - mobile.schema: dimension.json
        - mobile.value: 46px
        - mobile.uuid: 4e9d9b63-989a-4b63-b74d-22b5188f8df7
    - `switch-control-height-small`
        - desktop.schema: dimension.json
        - desktop.value: 14px
        - desktop.uuid: 3bf75a24-5e95-4c18-9da2-b7088377fe21
        - mobile.schema: dimension.json
        - mobile.value: 18px
        - mobile.uuid: a1dbcaf0-bbcf-444d-9d22-7f86db20303a
    - `switch-control-height-medium`
        - desktop.schema: dimension.json
        - desktop.value: 16px
        - desktop.uuid: f97f0f1b-c0c2-410f-b116-86d30f4d52cf
        - mobile.schema: dimension.json
        - mobile.value: 20px
        - mobile.uuid: 0d5f13f2-4d5b-4c30-b3a3-fa4fcc33b928
    - `switch-control-height-large`
        - desktop.schema: dimension.json
        - desktop.value: 18px
        - desktop.uuid: 8301bfca-a086-4efd-a22f-1d348cbd6dcf
        - mobile.schema: dimension.json
        - mobile.value: 22px
        - mobile.uuid: 91b828ce-8ff9-4d32-958e-a8a23ef9b345
    - `switch-control-height-extra-large`
        - desktop.schema: dimension.json
        - desktop.value: 20px
        - desktop.uuid: 2372d602-78ce-45a7-9dff-152152e55117
        - mobile.schema: dimension.json
        - mobile.value: 26px
        - mobile.uuid: b7ae7b32-b347-4e09-9978-3b0b92a4dbab
    - `switch-top-to-control-small`
        - desktop.schema: dimension.json
        - desktop.value: 6px
        - desktop.uuid: 8a907825-236c-4548-91c4-2123e095726c
        - mobile.schema: dimension.json
        - mobile.value: 7px
        - mobile.uuid: f379c453-da21-41f6-92d1-9b6bdb95fd86
    - `switch-top-to-control-medium`
        - desktop.schema: dimension.json
        - desktop.value: 9px
        - desktop.uuid: 0135b823-5097-43bb-9911-9f731146af3b
        - mobile.schema: dimension.json
        - mobile.value: 11px
        - mobile.uuid: 68276028-41d8-49e1-b0d4-f70cd27ab149
    - `switch-top-to-control-large`
        - desktop.schema: dimension.json
        - desktop.value: 12px
        - desktop.uuid: f2c965e6-89fb-4b9d-843d-cfde31b7703d
        - mobile.schema: dimension.json
        - mobile.value: 15px
        - mobile.uuid: 035e786b-17f2-488e-a049-84b257a3312f
    - `switch-top-to-control-extra-large`
        - desktop.schema: dimension.json
        - desktop.value: 15px
        - desktop.uuid: fbc21571-970f-4bb2-8280-f6262446896b
        - mobile.schema: dimension.json
        - mobile.value: 19px
        - mobile.uuid: 7e95ad9a-ca10-4f06-9c19-8dd2270cfdad
    - `radio-button-control-size-small`
        - desktop.schema: dimension.json
        - desktop.value: 12px
        - desktop.uuid: 407304fc-7c74-4427-9032-b44ab03c07ce
        - mobile.schema: dimension.json
        - mobile.value: 16px
        - mobile.uuid: 90a2b18a-61c7-40d8-926c-d6b18a641010
    - `radio-button-control-size-medium`
        - desktop.schema: dimension.json
        - desktop.value: 14px
        - desktop.uuid: 9de5b045-532c-48ef-872e-bd3c22f89a41
        - mobile.schema: dimension.json
        - mobile.value: 18px
        - mobile.uuid: 2eef4003-e666-48e7-b25b-8c50063ce400
    - `radio-button-control-size-large`
        - desktop.schema: dimension.json
        - desktop.value: 16px
        - desktop.uuid: cadf4b9e-b4d4-4ff5-808b-557864cf7dc8
        - mobile.schema: dimension.json
        - mobile.value: 20px
        - mobile.uuid: 23d0a4aa-693d-4b79-b942-3898f9cf0b80
    - `radio-button-control-size-extra-large`
        - desktop.schema: dimension.json
        - desktop.value: 18px
        - desktop.uuid: f8f1d29b-4093-40ed-b73c-7a27e27a63a4
        - mobile.schema: dimension.json
        - mobile.value: 22px
        - mobile.uuid: cc041f48-aaa4-4c20-8990-599e0c56134e
    - `radio-button-top-to-control-small`
        - desktop.schema: dimension.json
        - desktop.value: 6px
        - desktop.uuid: b775d7e9-d182-4818-9ae0-b3765a0ecbf7
        - mobile.schema: dimension.json
        - mobile.value: 7px
        - mobile.uuid: 02438c4c-161d-45eb-935d-b083ab830876
    - `radio-button-top-to-control-medium`
        - desktop.schema: dimension.json
        - desktop.value: 9px
        - desktop.uuid: dcc0155a-6bd1-4148-acaf-e255a7f4d22a
        - mobile.schema: dimension.json
        - mobile.value: 11px
        - mobile.uuid: 2f805530-cefe-420a-89e6-a6a81c0faea0
    - `radio-button-top-to-control-large`
        - desktop.schema: dimension.json
        - desktop.value: 12px
        - desktop.uuid: 309c9559-1763-4345-8090-aaa12f570889
        - mobile.schema: dimension.json
        - mobile.value: 15px
        - mobile.uuid: 41d0dde7-de34-4e99-96d0-4f727ed71673
    - `radio-button-top-to-control-extra-large`
        - desktop.schema: dimension.json
        - desktop.value: 15px
        - desktop.uuid: f4620f0a-43ba-4650-8640-9425ed1a1260
        - mobile.schema: dimension.json
        - mobile.value: 19px
        - mobile.uuid: c478710f-1747-455b-998a-6fa837762905
    - `field-label-top-margin-medium`
        - value: 0px
    - `field-label-top-margin-large`
        - value: 0px
    - `field-label-top-margin-extra-large`
        - value: 0px
    - `status-light-dot-size-small`
        - desktop.schema: dimension.json
        - desktop.value: 8px
        - desktop.uuid: 04485265-2983-4377-9ec5-f2456863a1df
        - mobile.schema: dimension.json
        - mobile.value: 10px
        - mobile.uuid: 5945e9fe-311a-4d2c-8052-ca4eae4c7c63
    - `action-bar-height`
        - value: component-height-400
    - `action-bar-top-to-item-counter`
        - value: component-top-to-text-300
    - `picker-border-width`
        - value: border-width-100
    - `breadcrumbs-top-to-truncated-menu`
        - value: 0px
    - `breadcrumbs-truncated-menu-to-bottom-text`
        - desktop.schema: dimension.json
        - desktop.value: 4px
        - desktop.uuid: 2285d870-68ec-469f-a034-2fdeb31e33f0
        - mobile.schema: dimension.json
        - mobile.value: 5px
        - mobile.uuid: 154bce30-bfe2-445b-bbdd-69efce5565ae
    - `in-field-button-fill-stacked-inner-border-rounding`
        - value: 0px
    - `in-field-button-stacked-inner-edge-to-fill`
        - value: 0px
    - `in-field-button-outer-edge-to-disclosure-icon-stacked-medium`
        - value: 3px
    - `in-field-button-outer-edge-to-disclosure-icon-stacked-large`
        - value: 4px
    - `in-field-button-outer-edge-to-disclosure-icon-stacked-extra-large`
        - value: 5px
    - `in-field-button-inner-edge-to-disclosure-icon-stacked-small`
        - value: in-field-button-outer-edge-to-disclosure-icon-stacked-small
    - `in-field-button-inner-edge-to-disclosure-icon-stacked-medium`
        - value: in-field-button-outer-edge-to-disclosure-icon-stacked-medium
    - `in-field-button-inner-edge-to-disclosure-icon-stacked-large`
        - value: in-field-button-outer-edge-to-disclosure-icon-stacked-large
    - `in-field-button-inner-edge-to-disclosure-icon-stacked-extra-large`
        - value: in-field-button-outer-edge-to-disclosure-icon-stacked-extra-large
    - `icon-color-green-primary-default`
        - value: green-800
    - `background-base-color`
        - value: gray-25
    - `background-layer-1-color`
        - value: gray-50
    - `neutral-background-color-default`
        - value: gray-800
    - `neutral-background-color-hover`
        - value: gray-900
    - `neutral-background-color-down`
        - value: gray-900
    - `neutral-background-color-key-focus`
        - value: gray-900
    - `neutral-background-color-selected-default`
        - value: gray-800
    - `neutral-background-color-selected-hover`
        - value: gray-900
    - `neutral-background-color-selected-down`
        - value: gray-900
    - `neutral-background-color-selected-key-focus`
        - value: gray-900

    </details>
    <details><summary>Deleted Properties (840)</summary>

    - `font-size-25`
        - uuid: f0c5ab51-5fc0-417d-a57a-edd12a62847e
    - `font-size-50`
        - uuid: daa864c1-e91e-4357-bcfc-02f3a5037f9c
    - `font-size-75`
        - uuid: 5cf4dd2a-2a85-4eb6-b163-fa6737e4f838
    - `font-size-100`
        - uuid: 86103cc9-4510-45af-8139-a81ea3b69da7
    - `font-size-200`
        - uuid: 0cfbf6f7-7e79-44bb-af03-6355f412f590
    - `font-size-300`
        - uuid: cd34b2cb-e7fa-41dd-bd1e-cb1e8113554a
    - `font-size-400`
        - uuid: c5ae539c-9b16-489a-a39b-c9cee1a1701b
    - `font-size-500`
        - uuid: ff5914d7-5d19-4b21-b633-c742d95942db
    - `font-size-600`
        - uuid: ed0c86e1-f062-405e-a1c4-ce74f62c0ea7
    - `font-size-700`
        - uuid: b2b59d6e-50f8-4e72-a5c5-993a87971e3d
    - `font-size-800`
        - uuid: 3b3711a6-44fd-44b5-b273-e2c775a15986
    - `font-size-900`
        - uuid: b164fd8e-2d83-45fc-b636-dba832faad37
    - `font-size-1000`
        - uuid: db55c6a2-c72d-4e63-838c-5f30d467bb66
    - `font-size-1100`
        - uuid: 56149ad7-84a7-4067-bad8-c5b143dd0561
    - `font-size-1200`
        - uuid: 164b0eae-cd17-4e2c-8f30-436c0df7d4c9
    - `font-size-1300`
        - uuid: db26e411-a118-4bef-a413-eeb383e85f37
    - `heading-sans-serif-font-weight`
        - component: heading
        - spectrum.schema: alias.json
        - spectrum.value: bold-font-weight
        - spectrum.uuid: 1d4d09b4-021a-48e8-a724-bfecc13df325
        - express.schema: alias.json
        - express.value: black-font-weight
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: e5bfbd82-a8e6-43dc-b2b6-dc1e171f48aa
    - `heading-serif-font-weight`
        - component: heading
        - spectrum.schema: alias.json
        - spectrum.value: bold-font-weight
        - spectrum.uuid: 350aa193-9996-49c8-b5e4-54d4f7bef3c2
        - express.schema: alias.json
        - express.value: black-font-weight
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: 36bea3bb-06b8-4c66-87ad-ffc86be18243
    - `heading-cjk-font-weight`
        - component: heading
        - spectrum.schema: alias.json
        - spectrum.value: extra-bold-font-weight
        - spectrum.uuid: bd54516c-2fda-4421-ab62-720c3a887a34
        - express.schema: alias.json
        - express.value: black-font-weight
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: 21643fcd-b1da-4057-8fb5-e75167c0d89f
    - `heading-sans-serif-emphasized-font-weight`
        - component: heading
        - spectrum.schema: alias.json
        - spectrum.value: bold-font-weight
        - spectrum.uuid: e4a183fd-53c5-4dbb-afd1-6308e2e74f80
        - express.schema: alias.json
        - express.value: black-font-weight
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: 723c8306-12fb-4cb5-9fd2-3ad40d57bb25
    - `heading-serif-emphasized-font-weight`
        - component: heading
        - spectrum.schema: alias.json
        - spectrum.value: bold-font-weight
        - spectrum.uuid: a0983216-b0c5-4a3f-97dc-96ee711acb1f
        - express.schema: alias.json
        - express.value: black-font-weight
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: e9b3a7b0-ae46-48be-a143-f26463860d3f
    - `accent-color-100`
        - spectrum.schema: alias.json
        - spectrum.value: blue-100
        - spectrum.uuid: 2e080bb5-6f2c-4fd9-96a2-bf9fc19d2649
        - express.schema: alias.json
        - express.value: indigo-100
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: f9fc7606-b699-46e7-b139-aeefc287923c
    - `accent-color-200`
        - spectrum.schema: alias.json
        - spectrum.value: blue-200
        - spectrum.uuid: cf583998-4dfd-4222-a554-8e05ed7fb5d6
        - express.schema: alias.json
        - express.value: indigo-200
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: 78e50d0b-78a0-46c4-8262-417143f00902
    - `accent-color-300`
        - spectrum.schema: alias.json
        - spectrum.value: blue-300
        - spectrum.uuid: ea67f054-1f42-427e-a768-beb8d21de2a3
        - express.schema: alias.json
        - express.value: indigo-300
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: d014e1e8-a5f8-4169-8c43-d69afd07847a
    - `accent-color-400`
        - spectrum.schema: alias.json
        - spectrum.value: blue-400
        - spectrum.uuid: a249e4b1-e6f9-4ef3-96c6-1559059839a7
        - express.schema: alias.json
        - express.value: indigo-400
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: 1b70bc67-7877-4f92-8ce4-1abd2665fab1
    - `accent-color-500`
        - spectrum.schema: alias.json
        - spectrum.value: blue-500
        - spectrum.uuid: c1c0e6fb-ce21-49d7-91bb-73ce873aa69f
        - express.schema: alias.json
        - express.value: indigo-500
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: 06246e8e-44da-49a3-8d65-7f3ce1ec8128
    - `accent-color-600`
        - spectrum.schema: alias.json
        - spectrum.value: blue-600
        - spectrum.uuid: 5a2000be-5640-4389-a128-b2c164ad2253
        - express.schema: alias.json
        - express.value: indigo-600
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: eaee7f34-1725-411e-9a23-2331167e08f5
    - `accent-color-700`
        - spectrum.schema: alias.json
        - spectrum.value: blue-700
        - spectrum.uuid: a8fbe39b-db6d-4bb4-a7c5-8a235060d2ae
        - express.schema: alias.json
        - express.value: indigo-700
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: 5c7ac5cc-4fe4-4392-a5c3-4274cd15a48e
    - `accent-color-800`
        - spectrum.schema: alias.json
        - spectrum.value: blue-800
        - spectrum.uuid: 87a2c8f0-54fd-4939-8f42-3124fde1e49e
        - express.schema: alias.json
        - express.value: indigo-800
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: 3cf62c35-1e2e-4400-886f-473de9e8a958
    - `accent-color-900`
        - spectrum.schema: alias.json
        - spectrum.value: blue-900
        - spectrum.uuid: 90d82778-1cbb-47c0-aab9-b6e38a9cdc54
        - express.schema: alias.json
        - express.value: indigo-900
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: 42d37753-8b78-4328-a895-7b74d9a7aa86
    - `accent-color-1000`
        - spectrum.schema: alias.json
        - spectrum.value: blue-1000
        - spectrum.uuid: 9bf3fa2f-75d3-44d3-ae30-d88893665366
        - express.schema: alias.json
        - express.value: indigo-1000
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: b848c6ce-f921-4303-b298-20e359a1aa2e
    - `accent-color-1100`
        - spectrum.schema: alias.json
        - spectrum.value: blue-1100
        - spectrum.uuid: f7f853a5-f091-4a7e-8aea-68d060c840f0
        - express.schema: alias.json
        - express.value: indigo-1100
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: 46991cf0-e4e5-4c32-a140-4589e2456523
    - `accent-color-1200`
        - spectrum.schema: alias.json
        - spectrum.value: blue-1200
        - spectrum.uuid: 7c141cdb-1e5e-468a-ba48-0df01b275402
        - express.schema: alias.json
        - express.value: indigo-1200
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: 7de1e3f0-a5b3-4a09-955b-242ff78dbaa9
    - `accent-color-1300`
        - spectrum.schema: alias.json
        - spectrum.value: blue-1300
        - spectrum.uuid: f7307eba-e311-41a8-bb50-0b1e96833dfa
        - express.schema: alias.json
        - express.value: indigo-1300
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: a598813b-347f-4528-aa35-94b6642985db
    - `accent-color-1400`
        - spectrum.schema: alias.json
        - spectrum.value: blue-1400
        - spectrum.uuid: 06585cf4-a924-49b2-b6c8-f0e80b57c576
        - express.schema: alias.json
        - express.value: indigo-1400
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: 12c250df-6088-4c20-8b04-59814d53ed7a
    - `corner-radius-75`
        - spectrum.schema: dimension.json
        - spectrum.value: 2px
        - spectrum.uuid: ecb9d03a-7340-4b43-8aa7-f89eef9f3a20
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 3px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: ff10f01b-82a9-46cb-8581-3b02f3dc988d
        - express.mobile.schema: dimension.json
        - express.mobile.value: 4px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: a02a1154-142f-43bf-b3d7-91dafdc4a40d
        - express.uuid: 8876ffa3-b0af-4cf5-ae8d-5c4ae3766cca
    - `corner-radius-100`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 4px
        - spectrum.desktop.uuid: bf24d15e-ad86-4b6a-a9e0-e8fd49a5ae30
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 5px
        - spectrum.mobile.uuid: e22537bb-a29f-47e5-be13-7e2775ee1103
        - spectrum.uuid: 67b83ee8-2782-48a5-ba27-70f690c95b4a
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 6px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 36d9fa63-3f0f-4ce3-8cc6-2d70472e519c
        - express.mobile.schema: dimension.json
        - express.mobile.value: 8px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 2bc66f64-7546-4501-9604-d40759b10062
        - express.uuid: 179b1a27-66f9-47b9-9af9-648c0a3dbbfb
    - `corner-radius-200`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 8px
        - spectrum.desktop.uuid: 52ad01be-f512-4fa3-ae67-8c6cef70810c
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 10px
        - spectrum.mobile.uuid: 23f751eb-a076-487d-a5e1-1c0eb2937018
        - spectrum.uuid: 39fdb6a8-579e-4a14-8cee-f2f877efa262
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 12px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 72f53c69-0ce4-4d02-835d-4513838db9e8
        - express.mobile.schema: dimension.json
        - express.mobile.value: 16px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: c6a87683-3fc2-494a-9650-8edc3d75cba9
        - express.uuid: 91db63f4-2719-4d6a-8817-3518bd163e40
    - `drop-shadow-x`
        - spectrum.schema: dimension.json
        - spectrum.value: 0px
        - spectrum.uuid: 81415747-aa3f-4ef3-b0bc-7c33f07a4316
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 0px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: b2f11af3-12fe-436a-aa83-9e96a08c7cf5
        - express.mobile.schema: dimension.json
        - express.mobile.value: 0px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: d40c3468-2f10-41be-940b-96933464efae
        - express.uuid: 38b1404c-eb80-493f-acc2-305017351d4b
    - `drop-shadow-y`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 1px
        - spectrum.desktop.uuid: c530129f-248c-4e36-ba7f-05d6d6a53962
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 2px
        - spectrum.mobile.uuid: 32950bbd-7292-452d-a445-4eb6de66c77d
        - spectrum.uuid: 03b1bdf3-05d0-4557-999d-d33b4720113a
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 4px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: c76888b3-57c0-45fb-9c55-ac21d95a9263
        - express.mobile.schema: dimension.json
        - express.mobile.value: 4px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: a4213f34-f0ee-45a1-a2ed-225bbe0ec857
        - express.uuid: 5b5d8ba2-7724-4e26-889c-a7cea9bbfa1c
    - `drop-shadow-blur`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 4px
        - spectrum.desktop.uuid: ac20a6da-31a7-4c8b-b361-0ad820cd8429
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 6px
        - spectrum.mobile.uuid: 374f321e-8b0b-442b-9494-6a2ae9936c6b
        - spectrum.uuid: 02eb1f7e-4bce-444f-bf93-0a45ab56806a
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 16px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: b2677a44-abf9-44db-9d06-35039ffa47fd
        - express.mobile.schema: dimension.json
        - express.mobile.value: 16px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 2529adec-ab2e-4e04-aa83-fa9cdd7df1f2
        - express.uuid: 0682005e-7411-4680-9db7-6df9482f5b95
    - `text-to-visual-50`
        - uuid: 45ffa741-ec89-407b-83c2-39e6804308f8
    - `text-to-visual-75`
        - uuid: d9b8cf33-161d-4b3b-9c7d-7f5360a94e64
    - `text-to-visual-100`
        - uuid: b877c328-b5bd-48f1-9fdc-4a6c557313bb
    - `text-to-visual-200`
        - uuid: 90cae9f7-835c-4851-95eb-cce34d453c20
    - `text-to-visual-300`
        - uuid: add08b8b-d180-4fa6-badb-a766187ceb6b
    - `text-to-control-75`
        - uuid: 575fe03c-2997-4492-ba59-f590aa34820c
    - `text-to-control-100`
        - uuid: 4870a9a6-d2c6-4d6d-befb-933921c3d182
    - `text-to-control-200`
        - uuid: e6dca753-d2f4-4502-9ea4-2d632a8f40de
    - `text-to-control-300`
        - uuid: 081770e3-71c4-4ffb-b2e0-92ca7879c4cb
    - `component-height-50`
        - uuid: 13c3b57a-2950-4189-883d-844443ec0645
    - `component-height-75`
        - uuid: 1a38cc62-cb04-411e-b930-a851e2a9fc80
    - `component-height-100`
        - uuid: 86326f77-c65f-472f-b440-828f5735dbb6
    - `component-height-200`
        - uuid: cd07b99a-ce5c-4bc8-bbb8-fa56124cf8ee
    - `component-height-300`
        - uuid: dbbbffcf-cf35-4a0e-993e-488a6becc72f
    - `component-height-400`
        - uuid: 47e795c1-92ce-4f6c-8f90-a658746ab0d1
    - `component-height-500`
        - uuid: 44c5972b-cd50-4fc6-b3e6-e65400f0d611
    - `border-width-100`
        - spectrum.schema: dimension.json
        - spectrum.value: 1px
        - spectrum.uuid: b5525080-28e7-4eb7-aee9-fb2c71a16f68
        - express.schema: dimension.json
        - express.value: 2px
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: 84d5fd5a-8245-44b0-8ce5-2ca22a0bc75c
    - `component-pill-edge-to-visual-75`
        - uuid: 8e75a202-e6ad-41b5-bdb4-5a9c6adcfb35
    - `component-pill-edge-to-visual-100`
        - uuid: 4fe71ba1-df88-4ba4-b684-ee01862e6b16
    - `component-pill-edge-to-visual-200`
        - uuid: 5f14c09d-8b25-4a83-9804-d04d510dd78c
    - `component-pill-edge-to-visual-300`
        - uuid: b62d9c6a-c3be-4352-836d-603f3c54b175
    - `component-pill-edge-to-visual-only-75`
        - uuid: 403c6e59-3a0a-4933-8487-8759f27b78ad
    - `component-pill-edge-to-visual-only-100`
        - uuid: 5fbb20c1-14c1-46f7-97c9-9268b86ecda6
    - `component-pill-edge-to-visual-only-200`
        - uuid: 97f2e11f-7776-4c91-8d31-c53c0ba948bc
    - `component-pill-edge-to-visual-only-300`
        - uuid: 340e4059-a57e-4f8a-84ff-f1a249803b6e
    - `component-pill-edge-to-text-75`
        - uuid: 7d21104f-2c26-4b3a-85d7-7d6ca0f4dc40
    - `component-pill-edge-to-text-100`
        - uuid: 626e4e4d-99ca-428c-9cde-0db795355a72
    - `component-pill-edge-to-text-200`
        - uuid: f8f40a41-0cb2-40d8-a3fd-17470087db9a
    - `component-pill-edge-to-text-300`
        - uuid: 3e2dc939-a6c5-4654-bfe8-cf74f53cc75a
    - `component-edge-to-visual-50`
        - uuid: 7fb10519-3f10-4ba2-8332-4ff4472eac8c
    - `component-edge-to-visual-75`
        - uuid: ba705d7c-f284-4236-8167-a9e5594fd8f1
    - `component-edge-to-visual-100`
        - uuid: 8403ddee-81cf-4d2c-b370-93b3b22669d7
    - `component-edge-to-visual-200`
        - uuid: 82dbca52-b2a9-443a-a853-2d34b003e6d8
    - `component-edge-to-visual-300`
        - uuid: c2a9eb95-d607-4ed2-b565-64782e1764cf
    - `component-edge-to-visual-only-50`
        - uuid: 0bcf5bdc-9c4f-4200-a5a4-94373b65a362
    - `component-edge-to-visual-only-75`
        - uuid: 1a2a7e3d-8a64-4194-a8f2-a3cdc4fd716b
    - `component-edge-to-visual-only-100`
        - uuid: d7116e16-1489-41e3-a3cd-e022bea7467a
    - `component-edge-to-visual-only-200`
        - uuid: dc62e6e5-8da0-4059-898e-c054f06421eb
    - `component-edge-to-visual-only-300`
        - uuid: 2a0372fa-c799-41c8-bd8c-6649de123388
    - `component-edge-to-text-50`
        - uuid: bb17abc8-9204-4115-8a26-1555561121aa
    - `component-edge-to-text-75`
        - uuid: a59f2433-297e-4507-88d0-fd86f7f12be7
    - `component-edge-to-text-100`
        - uuid: f6173de9-ea58-48d0-a15f-f7622701ab4b
    - `component-edge-to-text-200`
        - uuid: 17b56bf2-6fb2-47a0-8e45-3586eef29324
    - `component-edge-to-text-300`
        - uuid: 82f28efb-5fd8-4a77-bc5e-59ff083bf82a
    - `component-top-to-workflow-icon-50`
        - uuid: 2a08f224-2540-4cc1-ac4e-2f6a51769a5f
    - `component-top-to-workflow-icon-75`
        - uuid: 494cd69a-7196-41c7-9817-60bc435c9b40
    - `component-top-to-workflow-icon-100`
        - uuid: 6128dae3-46d7-4948-9095-6506ae501323
    - `component-top-to-workflow-icon-200`
        - uuid: 7daefac9-1331-4775-913d-4fafc976bc3a
    - `component-top-to-workflow-icon-300`
        - uuid: 1a08144d-7a4b-4c3c-89e3-9f50f23a5da7
    - `component-top-to-text-50`
        - uuid: 0235ab3a-7c70-4e78-9208-8ed4e60ad2d2
    - `component-top-to-text-75`
        - uuid: b9430981-8544-4a73-912b-f06209e2f6f9
    - `component-top-to-text-100`
        - uuid: 85b23576-1071-4563-80b2-2b6b65755a5d
    - `component-top-to-text-200`
        - uuid: 32131b82-2cf1-45d5-9d94-2663a3585a83
    - `component-top-to-text-300`
        - uuid: f9a24565-3414-497c-99e9-16a9f27b3926
    - `component-bottom-to-text-50`
        - uuid: 5960d321-4b6a-4f0c-8e9b-8b59bd483e17
    - `component-bottom-to-text-75`
        - uuid: 47a641c0-5255-4558-9edd-dd525e14f1d0
    - `component-bottom-to-text-100`
        - uuid: 360272cc-c406-45ca-8a8e-4720a60c5af4
    - `component-bottom-to-text-200`
        - uuid: f1d6de68-8b40-4119-8326-66fd19afafac
    - `component-bottom-to-text-300`
        - uuid: 1d0da882-d145-4ede-8c27-42a174d757ec
    - `component-to-menu-small`
        - uuid: ed847a42-b5cc-4021-a2c1-047318f63248
    - `component-to-menu-medium`
        - uuid: 5bd2b0aa-7319-4049-b41f-b002a56144ec
    - `component-to-menu-large`
        - uuid: 48117dc9-284e-4f67-ad97-18d17e1f9be3
    - `component-to-menu-extra-large`
        - uuid: 20a4ee4f-c6c6-4268-bd80-27d5334d11d8
    - `field-edge-to-disclosure-icon-75`
        - uuid: a64a38da-9fe3-4af5-8fda-78482db6a1da
    - `field-edge-to-disclosure-icon-100`
        - uuid: d36e894c-0d0c-47cc-9cf1-5fc63e5e93e0
    - `field-edge-to-disclosure-icon-200`
        - uuid: 9fd501a5-8840-43ee-b0f5-ba0646b1eee4
    - `field-edge-to-disclosure-icon-300`
        - uuid: 0baf490e-6524-4b8a-b034-657c3cd5c802
    - `field-end-edge-to-disclosure-icon-75`
        - uuid: a38d41cf-b4cb-4293-9ba9-152f2350c7ff
    - `field-end-edge-to-disclosure-icon-100`
        - uuid: 7b1baf11-35a1-4ddb-be95-5eee88251e5c
    - `field-end-edge-to-disclosure-icon-200`
        - uuid: f75ad2a8-ad22-4c63-9624-15aad22b4d5c
    - `field-end-edge-to-disclosure-icon-300`
        - uuid: 0f2ae777-813a-42cf-83e8-581823edcb83
    - `field-top-to-disclosure-icon-75`
        - uuid: 85a92eb8-0462-42f2-8b6f-f4df85bb6618
    - `field-top-to-disclosure-icon-100`
        - uuid: 23b71bea-4132-4147-8b43-c122318f7e43
    - `field-top-to-disclosure-icon-200`
        - uuid: 86c7337b-7822-4f9b-a9d5-e951329388db
    - `field-top-to-disclosure-icon-300`
        - uuid: dd1fb027-a246-4582-80f2-b0f99afd74d9
    - `field-top-to-alert-icon-small`
        - uuid: d37b4194-0a79-4fc4-b320-b87dcba9a7ff
    - `field-top-to-alert-icon-medium`
        - uuid: 67a98dd3-363f-4efc-ac13-aed238653431
    - `field-top-to-alert-icon-large`
        - uuid: 817c73de-49d0-4f27-980e-63578db71c6c
    - `field-top-to-alert-icon-extra-large`
        - uuid: db3c0afa-1c9d-421e-a577-f61f5e31e5d2
    - `field-top-to-validation-icon-small`
        - uuid: 3308b2e4-9057-482d-b5fd-d6d46531cced
    - `field-top-to-validation-icon-medium`
        - uuid: ab32ee76-c561-43c2-baf7-8c3db125e5c6
    - `field-top-to-validation-icon-large`
        - uuid: 775f3bd0-63ec-43ae-83e6-7f66dea66607
    - `field-top-to-validation-icon-extra-large`
        - uuid: f95ff454-e453-4c6d-be7c-2e01d85728a3
    - `field-top-to-progress-circle-small`
        - uuid: 5bfcdf4a-be6a-45dc-9866-5c57b687629b
    - `field-top-to-progress-circle-medium`
        - uuid: b061d527-c92c-4786-93c4-e51ddb8c97c8
    - `field-top-to-progress-circle-large`
        - uuid: 4a775115-bbe4-4885-aee9-1a74b2a266a6
    - `field-top-to-progress-circle-extra-large`
        - uuid: 528f5802-0d21-4b83-b997-b8336694c6e8
    - `field-edge-to-alert-icon-small`
        - uuid: 0dfba3ee-758b-4cc0-ada5-a1411ff734cd
    - `field-edge-to-alert-icon-medium`
        - uuid: 6b74a006-ac79-49b9-a16e-fcd43554ac3b
    - `field-edge-to-alert-icon-large`
        - uuid: 883877b4-1b4f-4f52-9016-27b04a72b332
    - `field-edge-to-alert-icon-extra-large`
        - uuid: 0110b7bf-e4ef-4bbd-af35-a3bac8ecdbea
    - `field-edge-to-validation-icon-small`
        - uuid: 281499ca-f0ee-4864-8dee-7f51ab85b706
    - `field-edge-to-validation-icon-medium`
        - uuid: e4d505d2-5109-447a-a47d-57171d653770
    - `field-edge-to-validation-icon-large`
        - uuid: c08504fc-9b7a-4bfa-9544-4f6b9a52a0bc
    - `field-edge-to-validation-icon-extra-large`
        - uuid: f2b95331-5166-418a-b429-976ef95b95f1
    - `field-text-to-alert-icon-small`
        - uuid: 52dda1a3-282a-47a2-a867-d846f7f19471
    - `field-text-to-alert-icon-medium`
        - uuid: fdcd5d41-c5bf-4ec7-9258-d91384403221
    - `field-text-to-alert-icon-large`
        - uuid: 3b2c9e64-0eff-47df-afca-60cd8f2f36f2
    - `field-text-to-alert-icon-extra-large`
        - uuid: d2b8b5ce-c2e2-4998-bdd7-9816543d91cb
    - `field-text-to-validation-icon-small`
        - uuid: d017a7c2-6dda-4560-8c96-09f6265f44f5
    - `field-text-to-validation-icon-medium`
        - uuid: cd13895d-54d2-4cec-ad90-e34af8d83ddb
    - `field-text-to-validation-icon-large`
        - uuid: de02692e-742c-428b-9331-edf2984c5198
    - `field-text-to-validation-icon-extra-large`
        - uuid: f6f8e52f-02ae-4135-8d2d-22bb06e549a4
    - `field-width`
        - uuid: 5f0c388a-b159-412b-aca4-f31a35a28674
    - `character-count-to-field-quiet-small`
        - uuid: 23450319-d853-48e0-81dc-70bc7079d8aa
    - `character-count-to-field-quiet-medium`
        - uuid: 518b6d81-97c9-4ffc-9332-1ad3097c684a
    - `character-count-to-field-quiet-large`
        - uuid: 93632f57-880a-44aa-a0b3-31bdaaee559d
    - `character-count-to-field-quiet-extra-large`
        - uuid: ac67b79b-e1df-4873-b152-75124eb12777
    - `side-label-character-count-to-field`
        - uuid: ea77b9b5-6b36-48a7-b275-08726a1937cc
    - `side-label-character-count-top-margin-small`
        - desktop.schema: dimension.json
        - desktop.value: 4px
        - desktop.uuid: a86ae363-b6b4-4da0-9630-97336922b3a1
        - mobile.schema: dimension.json
        - mobile.value: 5px
        - mobile.uuid: 9196a2ad-67cd-44d8-b4c6-bca25e37eb4a
    - `side-label-character-count-top-margin-medium`
        - desktop.schema: dimension.json
        - desktop.value: 8px
        - desktop.uuid: 4d93210f-f01a-4d1c-8c10-2cb4b9d14626
        - mobile.schema: dimension.json
        - mobile.value: 10px
        - mobile.uuid: a2b20c88-d28c-4261-8160-62630c5e0da8
    - `side-label-character-count-top-margin-large`
        - desktop.schema: dimension.json
        - desktop.value: 11px
        - desktop.uuid: e2d9e241-469a-4b03-bd6a-a105a8ed5e00
        - mobile.schema: dimension.json
        - mobile.value: 14px
        - mobile.uuid: ca10a5d6-a8b2-414d-978a-14481e2a21cb
    - `side-label-character-count-top-margin-extra-large`
        - desktop.schema: dimension.json
        - desktop.value: 14px
        - desktop.uuid: 9b1f15bf-ea4f-4f82-8c4f-3770b7f47353
        - mobile.schema: dimension.json
        - mobile.value: 18px
        - mobile.uuid: c2c4ddf3-f273-4e23-9be0-e1227e9999a8
    - `disclosure-indicator-top-to-disclosure-icon-small`
        - uuid: c8b11a24-76e6-47be-8ccb-d8fc8f9d7b37
    - `disclosure-indicator-top-to-disclosure-icon-medium`
        - uuid: 84ad72d9-2639-4a7f-8300-0a717287cf39
    - `disclosure-indicator-top-to-disclosure-icon-large`
        - uuid: 736e1b2c-75e1-47a8-a238-ac3acebce092
    - `disclosure-indicator-top-to-disclosure-icon-extra-large`
        - uuid: f4459309-c64b-4b7b-8247-6c54cd1810c4
    - `navigational-indicator-top-to-back-icon-small`
        - uuid: 813ad969-82f0-437b-b595-4d5f4839fc90
    - `navigational-indicator-top-to-back-icon-medium`
        - uuid: f634deb6-920c-4c14-867e-7b10010ba391
    - `navigational-indicator-top-to-back-icon-large`
        - uuid: 82bf0b1c-f289-4b90-a033-db1f0affe297
    - `navigational-indicator-top-to-back-icon-extra-large`
        - uuid: d09f3117-e7d6-48d5-86ef-3652cf176450
    - `color-control-track-width`
        - uuid: b844f3de-6179-4326-ad9c-740eb8b7b8d1
    - `checkbox-control-size-small`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 12px
        - spectrum.desktop.uuid: 460e8170-de69-4f8e-8420-6c87a1f6f5cd
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 16px
        - spectrum.mobile.uuid: af31c1a5-ffce-4a54-8862-3e711ca53d25
        - spectrum.uuid: ee93bc59-4223-4538-9051-4fc0f78ade57
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 14px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 1df233fb-fa60-4690-9a7a-0a045b4ff732
        - express.mobile.schema: dimension.json
        - express.mobile.value: 18px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 13cd75f5-63de-4eb1-b3a6-528a9a853111
        - express.uuid: 5d1fc913-cf08-43c0-94f9-62d538e3ac5d
        - uuid: 3c21a6b5-0672-4e1c-b2a4-165ec6149b6d
    - `checkbox-control-size-medium`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 14px
        - spectrum.desktop.uuid: 86288454-7192-4e4c-b55f-fc509fc58c01
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 18px
        - spectrum.mobile.uuid: 00fee3f7-a743-45d6-a2b6-028d5d96964a
        - spectrum.uuid: 0d7dbbdf-726c-4b38-ae5c-8aae4a76b385
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 16px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 4612c7a8-c55f-44e8-baed-24c504f90412
        - express.mobile.schema: dimension.json
        - express.mobile.value: 20px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: a4a66e58-f688-4b8e-bb22-66499697eebd
        - express.uuid: 5938a3e2-01ae-49a5-b9b7-67bb1fcbf637
        - uuid: a0e56975-aaaa-4fa7-8dfe-b4d687f839cd
    - `checkbox-control-size-large`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 16px
        - spectrum.desktop.uuid: 839a52bc-b9ee-473f-acde-0799b4f55ded
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 20px
        - spectrum.mobile.uuid: b4367578-989e-438d-9a3e-7cb077f2f7c9
        - spectrum.uuid: c0fca44a-1dd6-43d8-bdeb-19964ba3f05f
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 18px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 72ae3a99-d684-4e96-bbd8-867e3f6a9ba9
        - express.mobile.schema: dimension.json
        - express.mobile.value: 22px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: e91c542f-aab9-42e7-a92b-1019f0c2d83d
        - express.uuid: 1c2ab94f-5e8b-4948-abf3-0ef29638a517
        - uuid: 94305933-512a-480d-a44a-a0ba990d0626
    - `checkbox-control-size-extra-large`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 18px
        - spectrum.desktop.uuid: 4ba47ba1-c9bd-447e-8948-009d5b424e0d
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 22px
        - spectrum.mobile.uuid: 13093f8b-e38e-449f-a982-7f960bb84dfa
        - spectrum.uuid: b38bbf4b-b515-4e5c-b339-1f604b865a9f
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 20px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 0e9c6726-327b-4771-841d-8864a7ccd984
        - express.mobile.schema: dimension.json
        - express.mobile.value: 26px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 028907b9-cfea-4464-8069-f796ff45871a
        - express.uuid: 40515720-9283-41bb-aaeb-7cfbe90239fc
        - uuid: 2f0c52c5-41b6-4d92-9345-50c448b9a79c
    - `checkbox-top-to-control-small`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 6px
        - spectrum.desktop.uuid: 20518175-5bc7-4659-8007-e74339c39433
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 7px
        - spectrum.mobile.uuid: f254146e-f469-44b1-b0c9-1ac72e88f9e3
        - spectrum.uuid: 0218ee16-f0d6-4e66-b9e0-680827ef3804
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 5px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 102073d3-985e-41f5-927f-c477be6557d5
        - express.mobile.schema: dimension.json
        - express.mobile.value: 6px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: e3a31d3c-a3ef-4644-9ad0-ee6ee196f3fc
        - express.uuid: db12768c-90b0-479c-905b-ae9589f5a0d7
        - uuid: 6293cb5a-79ce-4a80-8621-44b6e48175da
    - `checkbox-top-to-control-medium`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 9px
        - spectrum.desktop.uuid: dcde5d2d-60f8-4d56-bfb1-bba44a087515
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 11px
        - spectrum.mobile.uuid: e3751526-2db9-421c-85f9-d60071aac49b
        - spectrum.uuid: f828021f-4a1f-466c-b11f-7b146bd36832
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 8px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 96094695-7843-4144-9d6c-8e90b0c8f11e
        - express.mobile.schema: dimension.json
        - express.mobile.value: 10px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 19c53e39-2529-400e-849a-04210d29f022
        - express.uuid: 3c1cc90f-0e1d-4e83-afe9-7677e7ad39c6
        - uuid: 278b4c19-a365-465d-9169-f07611b0e6a4
    - `checkbox-top-to-control-large`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 12px
        - spectrum.desktop.uuid: 93edae08-5320-4e7e-a006-a9af1d3665ad
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 15px
        - spectrum.mobile.uuid: d040d2f4-9bb4-4d27-adac-40fef079d958
        - spectrum.uuid: fb853ce5-65d1-475b-9867-0e71d4af9536
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 11px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 771f42bc-63af-4b02-ab72-419913b9f72b
        - express.mobile.schema: dimension.json
        - express.mobile.value: 14px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 9952f0e9-8cf1-4a72-a584-99fe4b708b0e
        - express.uuid: f94fe1d8-a682-45b9-b005-1121b8788e67
        - uuid: 4d8d78c3-4f20-480a-9b92-bfa2ecd6d7ab
    - `checkbox-top-to-control-extra-large`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 15px
        - spectrum.desktop.uuid: 3c4217bb-91f2-4347-9f65-a0528992f600
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 19px
        - spectrum.mobile.uuid: b3be5ac8-2415-4490-8b4a-c08661ec84d1
        - spectrum.uuid: 77e9a03f-4936-43ca-8558-70d0f648618b
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 14px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 9b372f9e-f3b9-4fa6-9a12-fc50696c7e4e
        - express.mobile.schema: dimension.json
        - express.mobile.value: 17px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: f21573b4-a8e6-4209-9bc0-6030a542308f
        - express.uuid: f3bd16e7-db20-463b-89df-82886b0e7ef7
        - uuid: 28800a46-8103-4a0c-9e9e-753ecccd8160
    - `switch-control-width-small`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 23px
        - spectrum.desktop.uuid: f4d6fe1a-70bd-473a-9fa5-477865ea898e
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 32px
        - spectrum.mobile.uuid: ca939c4d-9369-498c-81cb-61df1397f657
        - spectrum.uuid: 0c641ef6-cd8b-4183-9ea9-29b3f30b90b2
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 25px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 0693a733-603d-4ff8-90b4-6b1bc3bd1681
        - express.mobile.schema: dimension.json
        - express.mobile.value: 32px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 76c9ee44-720a-4ce0-88a5-15d93c6f9e32
        - express.uuid: 0719f43a-aa80-498b-8167-66bfa30d6fef
        - uuid: 8522cca3-2174-4d2f-96d8-443a4346442b
    - `switch-control-width-medium`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 26px
        - spectrum.desktop.uuid: d329eda6-f13d-4a44-b962-ff06c371ed93
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 36px
        - spectrum.mobile.uuid: ec2f3b6b-80db-4c43-bdd2-caee98796775
        - spectrum.uuid: a10c659f-6fb9-4cde-b996-42fa1e94d758
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 28px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 0897d478-5e14-4147-bb98-ba6566523009
        - express.mobile.schema: dimension.json
        - express.mobile.value: 36px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: bd5c5024-4e29-4aef-86e4-6a4f7568ca2f
        - express.uuid: 06a0ba1f-a914-4f9c-bade-1e930bb5273a
        - uuid: 22eb4f1e-4fbc-4088-8296-6abf56cb0126
    - `switch-control-width-large`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 29px
        - spectrum.desktop.uuid: cef839a5-2ba7-4e47-9a85-d94260a8ff10
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 41px
        - spectrum.mobile.uuid: 5c7bdcc9-63f8-4c4b-b26f-97b39f53dbea
        - spectrum.uuid: f9e23291-6110-4770-abeb-ec1bd6ef529c
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 32px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 4703d454-0374-4304-87c9-cc4ae86e4d59
        - express.mobile.schema: dimension.json
        - express.mobile.value: 41px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 5fa423b6-faa2-497e-9bbd-59cac5c9c696
        - express.uuid: 06cb2cd0-e437-48d4-850e-c6bb70f6bac5
        - uuid: 76311a72-2906-46c2-bd2f-e1cf55a1761c
    - `switch-control-width-extra-large`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 33px
        - spectrum.desktop.uuid: f3102afd-e5df-4912-9203-8226ce37fed5
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 46px
        - spectrum.mobile.uuid: 4e9d9b63-989a-4b63-b74d-22b5188f8df7
        - spectrum.uuid: 28d7a626-dbbf-401b-8c7b-5fa59f54242e
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 35px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 8efecc6d-6939-40ec-b7c9-077dddc2e4da
        - express.mobile.schema: dimension.json
        - express.mobile.value: 46px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 0f253bb1-11d1-4af3-901b-b7b4877d02fa
        - express.uuid: 6347a50c-ab8c-474c-b023-f240971a8dd3
        - uuid: 74704e52-a27a-4542-9172-21c7e8e94e01
    - `switch-control-height-small`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 12px
        - spectrum.desktop.uuid: 3bf75a24-5e95-4c18-9da2-b7088377fe21
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 16px
        - spectrum.mobile.uuid: a1dbcaf0-bbcf-444d-9d22-7f86db20303a
        - spectrum.uuid: a795d784-a67e-4689-8a30-029f096703b0
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 14px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 44ed85d1-9e7c-4d81-9150-ad83fdafc328
        - express.mobile.schema: dimension.json
        - express.mobile.value: 18px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: a0df76f3-334c-404e-af94-651dc1631551
        - express.uuid: dd76c4a0-5a57-4285-9dd7-9ce340373a1b
        - uuid: 98407df8-86cd-4c7e-a1f5-ac658f3acac0
    - `switch-control-height-medium`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 14px
        - spectrum.desktop.uuid: f97f0f1b-c0c2-410f-b116-86d30f4d52cf
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 18px
        - spectrum.mobile.uuid: 0d5f13f2-4d5b-4c30-b3a3-fa4fcc33b928
        - spectrum.uuid: d723ac24-d571-4680-85a2-df9bad339742
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 16px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 689162cb-9515-4d7d-bff3-8ae261aa314d
        - express.mobile.schema: dimension.json
        - express.mobile.value: 20px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 4d30aa11-6dfd-4049-97fb-becec10241d6
        - express.uuid: 3278cc86-d59d-4316-a4bd-4f7dd2a6d360
        - uuid: fa372672-47db-4a93-9c3f-9736305f8bfc
    - `switch-control-height-large`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 16px
        - spectrum.desktop.uuid: 8301bfca-a086-4efd-a22f-1d348cbd6dcf
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 20px
        - spectrum.mobile.uuid: 91b828ce-8ff9-4d32-958e-a8a23ef9b345
        - spectrum.uuid: 888da305-52db-492c-9133-1888ea0a0fe6
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 18px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: b8f10f46-a1f8-4c73-ae1a-a3d70258d894
        - express.mobile.schema: dimension.json
        - express.mobile.value: 22px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: db3ec089-c51c-48f6-9f3e-0588173bb5f2
        - express.uuid: 0f36a04c-8562-4cff-a1a4-0a16143eeeb4
        - uuid: c4264736-04eb-4f9c-a26b-f77dfc9af0fe
    - `switch-control-height-extra-large`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 18px
        - spectrum.desktop.uuid: 2372d602-78ce-45a7-9dff-152152e55117
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 22px
        - spectrum.mobile.uuid: b7ae7b32-b347-4e09-9978-3b0b92a4dbab
        - spectrum.uuid: bdae73c7-1606-4388-a35f-fde686f340f9
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 20px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 7891f610-9a54-4889-a5e7-747637939809
        - express.mobile.schema: dimension.json
        - express.mobile.value: 26px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 00e246ce-9510-4429-bbc9-74b442865798
        - express.uuid: f4770609-e927-4689-92eb-81b4b0667519
        - uuid: 3c695f82-7648-4565-85a9-c2aa0b5f0c83
    - `switch-top-to-control-small`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 6px
        - spectrum.desktop.uuid: 8a907825-236c-4548-91c4-2123e095726c
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 7px
        - spectrum.mobile.uuid: f379c453-da21-41f6-92d1-9b6bdb95fd86
        - spectrum.uuid: 38308100-a1fc-45bb-9aa6-a5aca196e168
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 5px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 6e1df1c4-6a80-4b8c-99aa-24308cc68c94
        - express.mobile.schema: dimension.json
        - express.mobile.value: 6px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 85c920b2-1f23-4bf1-90ae-e5c92d854c77
        - express.uuid: bc106555-0cda-4550-927a-671ae62b8adb
        - uuid: 5eb5b6a0-48fc-4200-8497-55db7da7e135
    - `switch-top-to-control-medium`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 9px
        - spectrum.desktop.uuid: 0135b823-5097-43bb-9911-9f731146af3b
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 11px
        - spectrum.mobile.uuid: 68276028-41d8-49e1-b0d4-f70cd27ab149
        - spectrum.uuid: c179855f-8577-4f10-9c9d-a2e822c30022
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 8px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: f5575230-258b-474c-b078-8935a9f02f23
        - express.mobile.schema: dimension.json
        - express.mobile.value: 10px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 7ba17c8b-51a1-47e3-a3be-7c8a746ab04c
        - express.uuid: d5370d57-4b1c-4cca-8c6d-d54bb4219d5e
        - uuid: aca3a431-36b6-43b9-b0b0-d64e84c350d4
    - `switch-top-to-control-large`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 12px
        - spectrum.desktop.uuid: f2c965e6-89fb-4b9d-843d-cfde31b7703d
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 15px
        - spectrum.mobile.uuid: 035e786b-17f2-488e-a049-84b257a3312f
        - spectrum.uuid: 162f29ee-4f53-4947-81a3-3c0e003f7997
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 11px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 2aae56b2-4639-41a4-9037-409412564fd0
        - express.mobile.schema: dimension.json
        - express.mobile.value: 14px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 43037e51-b895-4599-9d67-afcd17b0d9de
        - express.uuid: f5f708d8-967d-427d-9ea2-6617b4d9f28d
        - uuid: c701b308-8f16-4ea1-8654-72a2779f7500
    - `switch-top-to-control-extra-large`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 15px
        - spectrum.desktop.uuid: fbc21571-970f-4bb2-8280-f6262446896b
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 19px
        - spectrum.mobile.uuid: 7e95ad9a-ca10-4f06-9c19-8dd2270cfdad
        - spectrum.uuid: 0b6d95f7-8c05-4d78-83b9-f74bae363c32
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 14px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: b7e7048a-2a27-4ccc-8f4d-717c09fb5b3f
        - express.mobile.schema: dimension.json
        - express.mobile.value: 17px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 67f76075-33fb-4cbf-8785-cb1d626d2a04
        - express.uuid: 1f74569f-7529-4a33-ba04-36ee1fdb9a95
        - uuid: 89647edb-2cce-4be8-9644-e78d292d8d71
    - `radio-button-control-size-small`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 12px
        - spectrum.desktop.uuid: 407304fc-7c74-4427-9032-b44ab03c07ce
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 16px
        - spectrum.mobile.uuid: 90a2b18a-61c7-40d8-926c-d6b18a641010
        - spectrum.uuid: b934fcbd-f58e-4b8b-a890-698920829d3e
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 14px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: da052fde-007d-4c69-b112-67f50452755a
        - express.mobile.schema: dimension.json
        - express.mobile.value: 18px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: cf3edaa4-3897-491a-add0-53f8057925da
        - express.uuid: b122f7a1-df01-4c68-b980-cbcecf201307
        - uuid: 55afc37a-81ce-4065-96ca-556fc49e43bf
    - `radio-button-control-size-medium`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 14px
        - spectrum.desktop.uuid: 9de5b045-532c-48ef-872e-bd3c22f89a41
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 18px
        - spectrum.mobile.uuid: 2eef4003-e666-48e7-b25b-8c50063ce400
        - spectrum.uuid: 6926490d-dc56-4ca2-b733-848ea6a132da
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 16px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 14ea1874-1a46-404f-8baf-1c0c0832ff33
        - express.mobile.schema: dimension.json
        - express.mobile.value: 20px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: ae670151-1eaa-4de5-9a67-2e7a553b7b63
        - express.uuid: 7a50d806-bba1-45a0-bfb2-2d71b0086c09
        - uuid: 20f7aebf-f4c1-4e18-87a1-3726eb475b45
    - `radio-button-control-size-large`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 16px
        - spectrum.desktop.uuid: cadf4b9e-b4d4-4ff5-808b-557864cf7dc8
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 20px
        - spectrum.mobile.uuid: 23d0a4aa-693d-4b79-b942-3898f9cf0b80
        - spectrum.uuid: 1f303f57-24c3-447f-a2b8-3f9ff9d9bef0
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 18px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: ec32e1d6-da75-47f4-ae14-f47d28912187
        - express.mobile.schema: dimension.json
        - express.mobile.value: 22px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 2d0cb7dc-68e0-4e88-a2eb-5b4feac5c800
        - express.uuid: 4074251c-034d-4eff-916f-1cf3ac39e175
        - uuid: d12c6733-a8bc-4dac-8a02-b876a53509ce
    - `radio-button-control-size-extra-large`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 18px
        - spectrum.desktop.uuid: f8f1d29b-4093-40ed-b73c-7a27e27a63a4
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 22px
        - spectrum.mobile.uuid: cc041f48-aaa4-4c20-8990-599e0c56134e
        - spectrum.uuid: 30ff09c2-c18c-4dfa-bb30-361640e478c1
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 20px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: be02f790-a7a2-4570-9065-5942b690c7ed
        - express.mobile.schema: dimension.json
        - express.mobile.value: 26px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: c5f734ba-bf7a-4b64-8d70-8109fead6a90
        - express.uuid: 70167288-2023-4c23-bf26-420501bae9c2
        - uuid: 68b995ce-bbd8-44ba-9d72-df121fdfdd89
    - `radio-button-top-to-control-small`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 6px
        - spectrum.desktop.uuid: b775d7e9-d182-4818-9ae0-b3765a0ecbf7
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 7px
        - spectrum.mobile.uuid: 02438c4c-161d-45eb-935d-b083ab830876
        - spectrum.uuid: e8ec5366-9291-4c0f-9522-10367b2e5b2d
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 5px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 587b784a-09b3-48cb-987b-6e0ca4eff810
        - express.mobile.schema: dimension.json
        - express.mobile.value: 6px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 39ae9b23-fc0d-45d7-beaa-42e7489fbd6e
        - express.uuid: bb480f70-b3da-4158-bfac-2c59301f5acf
        - uuid: 2d2f9e65-7ced-446f-9592-fe7bf530cf62
    - `radio-button-top-to-control-medium`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 9px
        - spectrum.desktop.uuid: dcc0155a-6bd1-4148-acaf-e255a7f4d22a
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 11px
        - spectrum.mobile.uuid: 2f805530-cefe-420a-89e6-a6a81c0faea0
        - spectrum.uuid: c43d7fdb-420e-4909-a6ee-795495cb7c9d
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 8px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 53cf73f2-b7ad-4daf-88c0-c3285898120a
        - express.mobile.schema: dimension.json
        - express.mobile.value: 10px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 8629a0e6-b0bc-4447-b17d-8717b766579c
        - express.uuid: c91222de-62f2-4c42-a50e-87827f06d9ec
        - uuid: 783325cf-300a-46e3-baad-4b865c6df12f
    - `radio-button-top-to-control-large`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 12px
        - spectrum.desktop.uuid: 309c9559-1763-4345-8090-aaa12f570889
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 15px
        - spectrum.mobile.uuid: 41d0dde7-de34-4e99-96d0-4f727ed71673
        - spectrum.uuid: 8283fca4-caa5-4262-a626-85fffa65d9fb
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 11px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 5315bd57-b934-4668-8204-e64d2eec70e6
        - express.mobile.schema: dimension.json
        - express.mobile.value: 14px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 9db66e19-9553-47ca-ac5c-118a6b5f043a
        - express.uuid: 1e2896f0-3910-4a1e-8557-7929040f0155
        - uuid: e114b720-a1ad-4394-b8ce-6622d9886f8e
    - `radio-button-top-to-control-extra-large`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 15px
        - spectrum.desktop.uuid: f4620f0a-43ba-4650-8640-9425ed1a1260
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 19px
        - spectrum.mobile.uuid: c478710f-1747-455b-998a-6fa837762905
        - spectrum.uuid: dbeeb464-daab-4ac3-ab0c-63d3f0415554
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 14px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 37397c94-a464-4ae7-9448-720b4696bbdb
        - express.mobile.schema: dimension.json
        - express.mobile.value: 17px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 42768b7d-b75d-4236-a8d3-e14d1d6e6f55
        - express.uuid: 59e82c86-c8d7-4c47-8151-7e3efef51101
        - uuid: 741e1396-c77c-4ac8-8292-eb11963ef18b
    - `field-label-text-to-asterisk-small`
        - uuid: a02163f0-6509-4b95-9d41-9d992ac5deef
    - `field-label-text-to-asterisk-medium`
        - uuid: 2aab2a3d-b2d4-49f8-9467-4e35d3564637
    - `field-label-text-to-asterisk-large`
        - uuid: 671e4951-7e50-4dec-aff1-2833deb6a950
    - `field-label-text-to-asterisk-extra-large`
        - uuid: 9b85fe75-9b6c-47e7-bfbe-dddfcdfdac79
    - `field-label-top-to-asterisk-small`
        - uuid: 376801d0-554e-4889-91f4-cad3a023e486
    - `field-label-top-to-asterisk-medium`
        - uuid: b7d0b135-04ad-43fd-ad0e-ef9675c855dd
    - `field-label-top-to-asterisk-large`
        - uuid: 301d5efa-c1b8-476d-897b-75f4988c99e3
    - `field-label-top-to-asterisk-extra-large`
        - uuid: aaabc5b5-73a3-4d26-8a44-932981634cbd
    - `field-label-top-margin-medium`
        - desktop.schema: dimension.json
        - desktop.value: 4px
        - desktop.uuid: b5243f56-7985-4686-b41f-9b9b9a18b047
        - mobile.schema: dimension.json
        - mobile.value: 5px
        - mobile.uuid: 9d00a023-3a33-4b98-819e-3229e03d103b
    - `field-label-top-margin-large`
        - desktop.schema: dimension.json
        - desktop.value: 5px
        - desktop.uuid: f7dd90d8-91e6-4090-a5a9-6b30087860a4
        - mobile.schema: dimension.json
        - mobile.value: 6px
        - mobile.uuid: f83b208f-dfdb-49a8-aedd-08fe8c7a86a9
    - `field-label-top-margin-extra-large`
        - desktop.schema: dimension.json
        - desktop.value: 5px
        - desktop.uuid: 5c14d528-fe17-4b0b-a123-edbdb93fd173
        - mobile.schema: dimension.json
        - mobile.value: 6px
        - mobile.uuid: c4c5e251-d514-42cf-b9e3-56694910e95b
    - `field-label-to-component-quiet-small`
        - uuid: c29a472d-800e-4d65-b493-5a635047bd64
    - `field-label-to-component-quiet-medium`
        - uuid: 1805d2b6-66ab-40aa-9410-60ed20fe0bfd
    - `field-label-to-component-quiet-large`
        - uuid: a8efae7b-e0b5-4816-89d3-25fc716580f2
    - `field-label-to-component-quiet-extra-large`
        - uuid: 4d4dbbb1-4d22-4803-836f-8b89a8794302
    - `help-text-top-to-workflow-icon-small`
        - uuid: 031892d3-31f2-433f-bed0-72c5b3ab0432
    - `help-text-top-to-workflow-icon-medium`
        - uuid: 86ac0bd3-7ea6-4f80-9c73-c0c77616f246
    - `help-text-top-to-workflow-icon-large`
        - uuid: e5517e20-dd37-4e43-9880-6042eb4c91bb
    - `help-text-top-to-workflow-icon-extra-large`
        - uuid: 2969e536-134d-462c-b7c3-2bd4490ce23c
    - `status-light-dot-size-small`
        - value: 8px
        - uuid: 04485265-2983-4377-9ec5-f2456863a1df
    - `status-light-dot-size-medium`
        - uuid: 268c4731-1c52-47e1-b50d-e17b0fb1b1aa
    - `status-light-dot-size-large`
        - uuid: 1de5181f-8fb5-4123-85dd-c06a1382865f
    - `status-light-dot-size-extra-large`
        - uuid: c1561e03-afdd-4c60-ba43-9c850aefd20a
    - `status-light-top-to-dot-small`
        - uuid: dcb4e3bd-ebee-45d9-ad30-c91307c7a0a5
    - `status-light-top-to-dot-medium`
        - uuid: 2e620445-18c0-4fdf-9d6b-ba05960cb254
    - `status-light-top-to-dot-large`
        - uuid: abebffcd-877a-40ed-b538-10928353d74e
    - `status-light-top-to-dot-extra-large`
        - uuid: a8230bf5-89c7-4056-b8c7-29994e5524a0
    - `action-button-edge-to-hold-icon-medium`
        - uuid: 2ffb06a4-6d3e-4b04-ab4e-53c8af557540
    - `action-button-edge-to-hold-icon-large`
        - uuid: 8c025c63-8f5a-43b7-a1d7-658ca92409ff
    - `action-button-edge-to-hold-icon-extra-large`
        - uuid: 40e6526a-67c3-42b4-994e-6d30184dbfd0
    - `tooltip-tip-width`
        - uuid: a3e2c245-2819-491f-81d1-4455746231b0
    - `tooltip-tip-height`
        - uuid: c91eb240-75de-47f2-ada0-c4fa48b4a062
    - `tooltip-maximum-width`
        - uuid: 02a0befa-2079-4104-b00e-08f6e41648fa
    - `progress-circle-size-small`
        - uuid: 80dfceb1-2bd0-49a5-b1e4-c5ec0f1717b4
    - `progress-circle-size-medium`
        - uuid: 5ebff1b9-30c0-42ef-854a-d24dd35e5a73
    - `progress-circle-size-large`
        - uuid: 75855fb6-77c1-4bf0-b7a7-cdcea70fe114
    - `progress-circle-thickness-small`
        - uuid: 243aff09-e196-4c70-94fc-9b2bc7f0eaf5
    - `progress-circle-thickness-medium`
        - uuid: 16e18a45-36dd-49e6-8f7a-9f98b2d43f1e
    - `progress-circle-thickness-large`
        - uuid: aec2d866-6282-40e2-a3ac-62cb7972aac8
    - `toast-height`
        - uuid: 616ccaf7-d757-45f0-b212-782d7bee21fd
    - `toast-maximum-width`
        - uuid: a1b4c509-39db-436f-bece-147fe30760a7
    - `toast-top-to-workflow-icon`
        - uuid: 657689f7-d729-4707-9939-2006a8f55397
    - `toast-top-to-text`
        - uuid: 3654a646-a72d-4e5e-aec7-c388d21edf7f
    - `toast-bottom-to-text`
        - uuid: 01851120-86da-4060-9473-af6a6a3de7f5
    - `action-bar-height`
        - desktop.schema: dimension.json
        - desktop.value: 48px
        - desktop.uuid: e67822de-d0cd-4b49-8e90-6c43523bb4dd
        - mobile.schema: dimension.json
        - mobile.value: 56px
        - mobile.uuid: 4be2cf45-1ba5-4a6f-a004-8d26ecbb4c2f
    - `action-bar-top-to-item-counter`
        - desktop.schema: dimension.json
        - desktop.value: 14px
        - desktop.uuid: 73f82d09-7927-461c-b7d7-ab0bc6b3e3f9
        - mobile.schema: dimension.json
        - mobile.value: 16px
        - mobile.uuid: b8466a83-3409-47c0-a329-b8e83b83abdb
    - `swatch-size-extra-small`
        - uuid: 09fcadd8-5a2b-4a12-a6c9-9c21f119ddc7
    - `swatch-size-small`
        - uuid: b4e9a9b9-ced1-4dc9-bb56-ee4f5aeb3824
    - `swatch-size-medium`
        - uuid: 1b03fbc4-00a7-45cd-b328-f7180743a7bc
    - `swatch-size-large`
        - uuid: 2544beb5-a218-4fbe-992d-b282a732e7ed
    - `progress-bar-thickness-small`
        - uuid: a5bf84aa-2719-4204-b9f1-e7463ad010da
    - `progress-bar-thickness-medium`
        - uuid: 76bb6912-2bca-493f-a198-20aa7e1636b3
    - `progress-bar-thickness-large`
        - uuid: 2f57822d-5feb-425c-b76a-d2d393c4ee8e
    - `progress-bar-thickness-extra-large`
        - uuid: 83950b17-a2f2-404c-a76c-74bf43c0f663
    - `meter-width`
        - uuid: 25d19f48-7ab7-4176-b745-0bef75ebfe44
    - `meter-thickness-small`
        - uuid: c4e3b88c-9539-4741-a5ea-0e84953dc499
    - `meter-thickness-large`
        - uuid: 9e406a2a-3456-4d9d-8ad8-21ab27ec1be2
    - `tag-top-to-avatar-small`
        - uuid: e493f30d-e05e-46bd-80ec-cfe84fa0a5b5
    - `tag-top-to-avatar-medium`
        - uuid: 10f21fe1-6310-43a0-bdf1-0b4543914cf1
    - `tag-top-to-avatar-large`
        - uuid: b5b37323-fd9a-4f63-a222-9587cf71bfd0
    - `tag-top-to-cross-icon-small`
        - uuid: ca9917ec-e850-41f6-84af-496734f8a540
    - `tag-top-to-cross-icon-medium`
        - uuid: 7cbb04dd-d793-4749-b6f2-61a265b64787
    - `tag-top-to-cross-icon-large`
        - uuid: 7672a296-b875-4076-b342-695ff110246c
    - `popover-top-to-content-area`
        - desktop.schema: dimension.json
        - desktop.value: 4px
        - desktop.uuid: f97488e8-b1c1-442e-b98c-0ae6cff0b774
        - mobile.schema: dimension.json
        - mobile.value: 5px
        - mobile.uuid: 6165bae4-7148-4cb2-a1b4-38a25f2d8cde
    - `menu-item-edge-to-content-not-selected-small`
        - uuid: 6e23f979-9b82-4273-9221-b54a69fc4d99
    - `menu-item-edge-to-content-not-selected-medium`
        - uuid: d05d20d8-2ad8-4a2a-880f-5f14c7c2907e
    - `menu-item-edge-to-content-not-selected-large`
        - uuid: 9d0e4967-c42d-4366-9e0e-5f75b3b1ee30
    - `menu-item-edge-to-content-not-selected-extra-large`
        - uuid: 8d03e277-4105-45b0-adb6-d31d03a325dc
    - `menu-item-top-to-disclosure-icon-small`
        - uuid: 4fbc0a14-95ad-44d6-81d1-1115267dd83d
    - `menu-item-top-to-disclosure-icon-medium`
        - uuid: 0609f98d-936d-49df-905c-8d8beebbf900
    - `menu-item-top-to-disclosure-icon-large`
        - uuid: d0443e32-2ffe-4511-96a9-074ac27018dd
    - `menu-item-top-to-disclosure-icon-extra-large`
        - uuid: ef0132be-8760-4217-a056-13bff34a217a
    - `menu-item-top-to-selected-icon-small`
        - uuid: 5c019740-3fac-48b6-975b-bdb91b9149ee
    - `menu-item-top-to-selected-icon-medium`
        - uuid: 3413b81e-4352-4d15-9c62-bd55d2b9c032
    - `menu-item-top-to-selected-icon-large`
        - uuid: 113a8249-01fd-4395-a8a4-e26eec604a51
    - `menu-item-top-to-selected-icon-extra-large`
        - uuid: 2fb80685-2b2b-4656-a01f-92eb5dcb5b24
    - `slider-track-thickness`
        - spectrum.schema: dimension.json
        - spectrum.value: 2px
        - spectrum.uuid: 50a71b8b-30fb-40c0-b81e-5ce0dcc8c96b
        - express.schema: dimension.json
        - express.value: 4px
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: c3844fed-2f84-46da-9b00-cc8e0dbf0336
    - `slider-handle-size-small`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 14px
        - spectrum.desktop.uuid: 1384d419-bfad-44d7-847c-a0f2c195fb93
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 18px
        - spectrum.mobile.uuid: 7feb3d57-59fb-4095-966e-e8ca0e91442f
        - spectrum.uuid: 905e59c4-b869-4402-9e2e-f2074ab20da1
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 18px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: d59c3ced-b57a-4b42-8693-c71b3579f3a7
        - express.mobile.schema: dimension.json
        - express.mobile.value: 22px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: f424a2ec-ed1f-4739-b619-494e36f880e7
        - express.uuid: 8e355710-0035-48e8-bdd7-a13825f55d81
        - uuid: 0d2dfe7b-454d-46dc-8a3f-2c2f5c0db5c4
    - `slider-handle-size-medium`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 16px
        - spectrum.desktop.uuid: a8a02181-c797-461d-a666-a63f7535a096
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 20px
        - spectrum.mobile.uuid: 278fc618-f6c1-4d30-bf85-075654079003
        - spectrum.uuid: 0f08fea5-7d53-4926-993e-802718fef278
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 20px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 8e0e1863-e992-4ca4-b25e-ba93060a3746
        - express.mobile.schema: dimension.json
        - express.mobile.value: 24px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 04bef018-e59f-4c3d-8ece-79b9614fd813
        - express.uuid: 31039254-52a5-4425-97f5-e1f9c6af489f
        - uuid: 90b773f7-c468-4c4c-8550-348418ecf242
    - `slider-handle-size-large`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 18px
        - spectrum.desktop.uuid: 3df3c866-faf0-43db-8c18-f442e7f94822
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 22px
        - spectrum.mobile.uuid: 2a3fb9b0-d701-4e86-8180-9d81f68e91d5
        - spectrum.uuid: 06816d82-ca8a-4fe6-a8fe-6d72e22d0454
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 22px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: bbf15614-e738-43fb-9eef-011662f50591
        - express.mobile.schema: dimension.json
        - express.mobile.value: 28px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 1d5c2e61-9381-4434-b76f-2160e933ba79
        - express.uuid: b2c009ab-f8e9-4130-a320-6ec09d1367d7
        - uuid: 787fd218-8574-4fda-9018-4c0e0aea00cb
    - `slider-handle-size-extra-large`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 20px
        - spectrum.desktop.uuid: 10ccce0d-5a2c-414e-8055-0be76709c180
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 26px
        - spectrum.mobile.uuid: 413dc697-1f14-47c8-a7f2-e52254513e6e
        - spectrum.uuid: 24e9bdd3-8813-4f10-a388-8f184be9ccfd
        - express.schema: scale-set.json
        - express.desktop.schema: dimension.json
        - express.desktop.value: 24px
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 77fff5f5-8941-4cd4-b814-9eb5f0720e77
        - express.mobile.schema: dimension.json
        - express.mobile.value: 30px
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 5edbd2bb-e986-4e3a-a627-04f62c94384f
        - express.uuid: 401d401e-5b27-46e8-bcbb-fc047db69e37
        - uuid: 8b2ace76-b1ea-4531-abec-88125e5fa9de
    - `slider-handle-border-width-down-small`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 5px
        - spectrum.desktop.uuid: c9b7d8d9-c5ba-4d97-a03b-a214104ede23
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 7px
        - spectrum.mobile.uuid: 683fb538-290c-423f-990b-d7134e485f51
        - spectrum.uuid: a35fb778-2eaf-4d59-bfbf-5524578cfac5
        - express.schema: scale-set.json
        - express.desktop.schema: alias.json
        - express.desktop.value: border-width-200
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 02b0ad1e-392b-4db3-a002-e2893170d3ff
        - express.mobile.schema: alias.json
        - express.mobile.value: border-width-200
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 42c33935-3d84-4aef-a701-082db752cd15
        - express.uuid: 2308b8d4-1452-465e-b066-dddddba49d84
        - uuid: b8cc4125-f3f5-4aed-ac77-fa188656eeea
    - `slider-handle-border-width-down-medium`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 6px
        - spectrum.desktop.uuid: 63c65cd6-a2c2-4430-a1e9-cf82ae0a3f25
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 8px
        - spectrum.mobile.uuid: 25959ff8-6c2f-4612-8d69-b95bfe485ce4
        - spectrum.uuid: 385352b1-950f-4504-b379-0078d9fcffc0
        - express.schema: scale-set.json
        - express.desktop.schema: alias.json
        - express.desktop.value: border-width-200
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 8b9ec3a7-393b-4cce-82ce-3d75963f03f7
        - express.mobile.schema: alias.json
        - express.mobile.value: border-width-200
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 9ae32e64-309f-4732-b01b-3bebfb77d286
        - express.uuid: c41ea955-7214-4fe2-98a2-bddab9726bf4
        - uuid: a405fec1-85f5-4cfe-b066-b2c716a29285
    - `slider-handle-border-width-down-large`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 7px
        - spectrum.desktop.uuid: 525e7d74-2bc0-48ac-85ca-b07335819a31
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 9px
        - spectrum.mobile.uuid: 3bf8805b-b4f7-4d0d-af85-d227d6380539
        - spectrum.uuid: 873d633e-05b4-41ef-bb03-2ea881a177e2
        - express.schema: scale-set.json
        - express.desktop.schema: alias.json
        - express.desktop.value: border-width-200
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: 2a8534ec-8949-4212-9ed1-03ac9fd0349a
        - express.mobile.schema: alias.json
        - express.mobile.value: border-width-200
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: b8c147c1-f528-4878-bd5f-7438cac59070
        - express.uuid: 3cad035f-1b64-4d46-aecb-3ce12187c33c
        - uuid: e6c7529c-75a0-4c62-9d46-39af7351bdf3
    - `slider-handle-border-width-down-extra-large`
        - spectrum.schema: scale-set.json
        - spectrum.desktop.schema: dimension.json
        - spectrum.desktop.value: 8px
        - spectrum.desktop.uuid: 47d025e2-0b26-4ebc-9b46-3cd1e470b9bc
        - spectrum.mobile.schema: dimension.json
        - spectrum.mobile.value: 11px
        - spectrum.mobile.uuid: feac9f02-b52a-4694-a5d4-4b1930ab4f07
        - spectrum.uuid: c739756b-8b92-4069-97a7-ad2cedee1627
        - express.schema: scale-set.json
        - express.desktop.schema: alias.json
        - express.desktop.value: border-width-200
        - express.desktop.deprecated: true
        - express.desktop.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.desktop.uuid: c13916ff-d225-4106-a625-daea77871a31
        - express.mobile.schema: alias.json
        - express.mobile.value: border-width-200
        - express.mobile.deprecated: true
        - express.mobile.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.mobile.uuid: 4e420f10-cf3a-478f-a355-8f4050ea1b06
        - express.uuid: 7667b831-1b40-48af-a2f1-3e5be2f529c1
        - uuid: fb430d9a-23b5-4e93-9657-29602f65a3d0
    - `slider-handle-gap`
        - spectrum.schema: dimension.json
        - spectrum.value: 4px
        - spectrum.uuid: 1a257268-32e9-4c5c-8477-32a724ff1d42
        - express.schema: dimension.json
        - express.value: 0px
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: f7aa286c-54d8-4e6b-98b6-46cf06566ea7
    - `slider-control-to-field-label-small`
        - uuid: 06f79925-1918-4606-a51c-2b72f492a074
    - `slider-control-to-field-label-medium`
        - uuid: 9ceeb406-afeb-49e9-9164-002c9453fc34
    - `slider-control-to-field-label-large`
        - uuid: d181e55a-0c31-44bf-9a7e-24c37f5e387c
    - `slider-control-to-field-label-extra-large`
        - uuid: d639f201-40b0-48ab-bafa-9a7747286a6e
    - `picker-visual-to-disclosure-icon-small`
        - uuid: f09fc872-12e3-4c51-886a-5fcc5d37d7c4
    - `picker-visual-to-disclosure-icon-medium`
        - uuid: 8fd9c553-476d-4e22-abd6-998c187adfad
    - `picker-visual-to-disclosure-icon-large`
        - uuid: 1666090c-68db-472c-b241-1613de626cb7
    - `picker-visual-to-disclosure-icon-extra-large`
        - uuid: 9c18fc60-c69e-4432-9229-ed98c69445ca
    - `picker-border-width`
        - spectrum.schema: alias.json
        - spectrum.value: border-width-100
        - spectrum.uuid: 69c28762-f456-4641-b6ce-7cb295e3a27d
        - express.schema: alias.json
        - express.value: 0
        - express.uuid: 45392d0b-b92e-4e60-8b82-4bcfef7877eb
    - `text-area-minimum-width`
        - uuid: 2c9da183-d751-4fb4-8540-79056530396f
    - `text-area-minimum-height`
        - uuid: 68e71997-0765-4b0f-ba7a-a0b8f4cc897c
    - `combo-box-visual-to-field-button-small`
        - desktop.schema: dimension.json
        - desktop.value: 7px
        - desktop.uuid: 5d054a3e-e4bb-4ca3-b84a-51b3d7fa2cb8
        - mobile.schema: dimension.json
        - mobile.value: 9px
        - mobile.uuid: 4ccba158-da29-43a1-bbba-6531ecf98807
    - `combo-box-visual-to-field-button-medium`
        - desktop.schema: dimension.json
        - desktop.value: 8px
        - desktop.uuid: c5a4baf2-effe-4d9a-92f3-b4ead5440d36
        - mobile.schema: dimension.json
        - mobile.value: 10px
        - mobile.uuid: fefb7088-21e0-4cdf-a8a4-af2a6dcc2a1a
    - `combo-box-visual-to-field-button-large`
        - desktop.schema: dimension.json
        - desktop.value: 9px
        - desktop.uuid: 356c4912-69c7-4a95-956b-c1aa78cb02cb
        - mobile.schema: dimension.json
        - mobile.value: 11px
        - mobile.uuid: 1a529788-8b87-4eef-aa07-a4ffb955761c
    - `combo-box-visual-to-field-button-extra-large`
        - desktop.schema: dimension.json
        - desktop.value: 10px
        - desktop.uuid: 4a4ee415-1f25-4d36-928c-5ece0ce4abcc
        - mobile.schema: dimension.json
        - mobile.value: 13px
        - mobile.uuid: 50ecd11d-6710-46e9-b1c6-923bb1d9f494
    - `thumbnail-size-50`
        - uuid: 1bb0d68e-2f6d-4c1d-93e2-81f2ef9e12a3
    - `thumbnail-size-75`
        - uuid: e9f84d37-cff3-46bb-bc13-5cf963b50dcc
    - `thumbnail-size-100`
        - uuid: 0763361e-1d9d-4a9b-92af-3dad58f5f98c
    - `thumbnail-size-200`
        - uuid: 6b6551aa-b460-45cd-8608-13a4d8d5cf6b
    - `thumbnail-size-300`
        - uuid: 844d91a7-258f-447d-b0d6-a6f3920896fc
    - `thumbnail-size-400`
        - uuid: d38ca4ff-ec98-421d-98a8-5acc711b91ce
    - `thumbnail-size-500`
        - uuid: 193ad02b-a5f6-4bd3-8513-0d2016d4a1ed
    - `thumbnail-size-600`
        - uuid: 36850f43-0dcc-47f6-aa02-0f20a372d294
    - `thumbnail-size-700`
        - uuid: ab8e832e-7740-40c3-b204-ac3024fc0b90
    - `thumbnail-size-800`
        - uuid: a038ef04-cda6-4e10-a1f4-50011413fb2e
    - `thumbnail-size-900`
        - uuid: e72babfa-ddff-44b0-aaa6-19ee756e1759
    - `thumbnail-size-1000`
        - uuid: 9225b7e7-e866-4e54-abf0-77ded58b2f25
    - `alert-dialog-title-size`
        - desktop.schema: alias.json
        - desktop.value: heading-size-s
        - desktop.uuid: 9b7ce1fc-ea8a-4d7b-a926-0accbd6b1197
        - mobile.schema: alias.json
        - mobile.value: heading-size-xs
        - mobile.uuid: 3f362b57-09eb-4147-b366-5c1f04c9a29f
    - `alert-dialog-description-size`
        - desktop.schema: alias.json
        - desktop.value: body-size-s
        - desktop.uuid: 9dc42d1a-b87d-4a5d-a5a3-6afd4d5bd599
        - mobile.schema: alias.json
        - mobile.value: body-size-xs
        - mobile.uuid: 43c5762a-d3a6-49db-9e5e-4a524604fecc
    - `opacity-checkerboard-square-size`
        - uuid: df681295-c2f5-4d07-a8b0-689a94bb289c
    - `contextual-help-title-size`
        - desktop.schema: alias.json
        - desktop.value: heading-size-xs
        - desktop.uuid: 5358fd6c-d9a0-4caa-a85e-af82ed82efaf
        - mobile.schema: alias.json
        - mobile.value: heading-size-xxs
        - mobile.uuid: e91709ce-79e3-4a81-88fa-e124960d4389
    - `contextual-help-body-size`
        - desktop.schema: alias.json
        - desktop.value: body-size-s
        - desktop.uuid: e458fa68-ab9c-4441-a7d5-a02f42df1cae
        - mobile.schema: alias.json
        - mobile.value: body-size-xs
        - mobile.uuid: c180fa75-254e-4ee1-8b79-31a3d90254cc
    - `breadcrumbs-height-multiline`
        - uuid: ffd9914f-c51c-41ac-b1fb-b0c2ed3c13b6
    - `breadcrumbs-top-to-text`
        - desktop.schema: dimension.json
        - desktop.value: 13px
        - desktop.uuid: d084038e-bc31-43be-99ee-13cf727eaf9d
        - mobile.schema: dimension.json
        - mobile.value: 17px
        - mobile.uuid: c4e58bb6-dcd7-4b64-b881-5b918c346989
    - `breadcrumbs-top-to-text-compact`
        - desktop.schema: dimension.json
        - desktop.value: 11px
        - desktop.uuid: b19547e2-bd8f-435d-b726-4f2ce6a83984
        - mobile.schema: dimension.json
        - mobile.value: 16px
        - mobile.uuid: da5c0b1f-a8df-407c-888f-ac62d1fefa7c
    - `breadcrumbs-top-to-text-multiline`
        - uuid: 72d458f9-f98f-4e96-a190-bbe8c9461e23
    - `breadcrumbs-bottom-to-text`
        - desktop.schema: dimension.json
        - desktop.value: 15px
        - desktop.uuid: f0e6a20d-8c2d-4aa3-9060-b6ca66aa7943
        - mobile.schema: dimension.json
        - mobile.value: 19px
        - mobile.uuid: 971f1589-f80b-4c1e-8814-b5c286c5f561
    - `breadcrumbs-bottom-to-text-compact`
        - desktop.schema: dimension.json
        - desktop.value: 12px
        - desktop.uuid: 70a356be-c304-4bb4-a9df-97806931f089
        - mobile.schema: dimension.json
        - mobile.value: 19px
        - mobile.uuid: d783bd6f-fc7a-4be4-b53a-b8be86018b7b
    - `breadcrumbs-bottom-to-text-multiline`
        - uuid: 09bf854f-452b-4494-9c5c-624398030d4d
    - `breadcrumbs-start-edge-to-text`
        - desktop.schema: dimension.json
        - desktop.value: 8px
        - desktop.uuid: a0542dab-98fb-45d8-b4a0-79cfd2cc4f1c
        - mobile.schema: dimension.json
        - mobile.value: 9px
        - mobile.uuid: 6d632147-5a1e-4a19-9fca-019b234d0455
    - `breadcrumbs-top-text-to-bottom-text`
        - uuid: 0c3dc1de-a246-44b4-9bb6-650e6542f110
    - `breadcrumbs-top-to-separator-icon`
        - desktop.schema: dimension.json
        - desktop.value: 19px
        - desktop.uuid: 15e56281-5fc1-4b59-b815-fc333231e364
        - mobile.schema: dimension.json
        - mobile.value: 25px
        - mobile.uuid: 882046d8-7111-4020-bf31-b8eb9d9013e0
    - `breadcrumbs-top-to-separator-icon-compact`
        - desktop.schema: dimension.json
        - desktop.value: 15px
        - desktop.uuid: a63e8df1-124f-4f3e-9e1b-ba422b8d8257
        - mobile.schema: dimension.json
        - mobile.value: 23px
        - mobile.uuid: f6c5b011-ec25-42ea-a708-d7dca1b5fb5a
    - `breadcrumbs-top-to-separator-icon-multiline`
        - uuid: eb8f020c-8e62-42ee-9e0d-2de3377385cb
    - `breadcrumbs-separator-icon-to-bottom-text-multiline`
        - desktop.schema: dimension.json
        - desktop.value: 11px
        - desktop.uuid: 56dd2fd0-c7a3-4f2c-bda9-8e6ba6d99e6c
        - mobile.schema: dimension.json
        - mobile.value: 15px
        - mobile.uuid: 571239ce-690f-49ee-9e71-d14bbfe4b279
    - `breadcrumbs-top-to-truncated-menu`
        - desktop.schema: dimension.json
        - desktop.value: 8px
        - desktop.uuid: 751734bd-1c58-4222-bbd8-8b2349f2fbd2
        - mobile.schema: dimension.json
        - mobile.value: 10px
        - mobile.uuid: 793da276-18a6-46d0-a0e5-a1676c4df583
    - `breadcrumbs-top-to-truncated-menu-compact`
        - desktop.schema: dimension.json
        - desktop.value: 4px
        - desktop.uuid: e0aba287-799f-4621-97cb-563352002a20
        - mobile.schema: dimension.json
        - mobile.value: 5px
        - mobile.uuid: d5e92b0a-6d37-4b77-a5d0-6c4f1b9a722c
    - `breadcrumbs-truncated-menu-to-bottom-text`
        - value: 0px
        - uuid: 2285d870-68ec-469f-a034-2fdeb31e33f0
    - `avatar-size-50`
        - uuid: 74b61508-450d-4ccf-a004-87c6fdee3d14
    - `avatar-size-75`
        - uuid: fd0f42d3-3d6e-4078-9e7d-54cdf68779de
    - `avatar-size-100`
        - uuid: 36128b0d-b39f-49b0-9326-9aabdd9d4a18
    - `avatar-size-200`
        - uuid: e799a14e-ebe3-4a79-bffe-02519e4f8283
    - `avatar-size-300`
        - uuid: 9882a002-e081-4537-b31e-30d8d90a77b3
    - `avatar-size-400`
        - uuid: 7dd556a4-252f-4b83-93cc-827da0551b3a
    - `avatar-size-500`
        - uuid: a49b2760-8820-4266-bdb9-fc76ddc6d738
    - `avatar-size-600`
        - uuid: 1f23f3a9-5b76-4d27-a934-dcf8dda0afef
    - `avatar-size-700`
        - uuid: a73d1b8d-745c-4ad6-986f-e28c8937285a
    - `alert-banner-minimum-height`
        - uuid: 63ee45bd-4e77-4ab6-b0ff-8466a4072f52
    - `alert-banner-width`
        - uuid: 11184272-5c12-4487-b3db-f784466d0c58
    - `alert-banner-top-to-workflow-icon`
        - uuid: 6e8a1f16-b7f2-4bbc-8ce8-9f2badebb500
    - `alert-banner-top-to-text`
        - uuid: c586013e-3ba7-4e91-9377-decb2e82e3c6
    - `alert-banner-bottom-to-text`
        - uuid: 31c44c54-bb66-41f2-b47f-594931457cad
    - `rating-indicator-width`
        - uuid: 7c4bf44d-6562-467c-9bec-a24243c8028e
    - `rating-indicator-to-icon`
        - uuid: fed766b6-a8e3-42d5-82f5-fb3fa0fc229c
    - `color-area-width`
        - uuid: f6071bbd-61a1-46d8-9591-4da270732828
    - `color-area-minimum-width`
        - uuid: 5e72964b-31cc-44f7-9535-d6cf5a4f5131
    - `color-area-height`
        - uuid: 51fc2f80-5e26-4b16-9f99-bd7cdebe120e
    - `color-area-minimum-height`
        - uuid: 09eba209-c3f1-4ed6-96cc-47c63c4b0668
    - `color-wheel-width`
        - uuid: 441c23c9-98af-4db0-a74e-dbc70d34a0c4
    - `color-wheel-minimum-width`
        - uuid: 675789ec-f6bc-4378-a1fa-94e031de52f7
    - `color-slider-length`
        - uuid: f2c2cd54-9bc9-4eb9-b903-ebd285be2101
    - `color-slider-minimum-length`
        - uuid: 56a81108-825a-4b29-bc9a-af66d23c2a9a
    - `illustrated-message-title-size`
        - desktop.schema: alias.json
        - desktop.value: heading-size-m
        - desktop.uuid: 365ec548-431b-4e1e-9f9d-7b04d337f001
        - mobile.schema: alias.json
        - mobile.value: heading-size-s
        - mobile.uuid: cfca5a29-7073-4627-8a61-27d37552dc03
    - `illustrated-message-cjk-title-size`
        - desktop.schema: alias.json
        - desktop.value: heading-cjk-size-m
        - desktop.uuid: e77279df-bc62-441a-8a30-5faa41d0df10
        - mobile.schema: alias.json
        - mobile.value: heading-cjk-size-s
        - mobile.uuid: 00c938e6-e62e-4bc3-8884-cf23b10e286c
    - `illustrated-message-body-size`
        - desktop.schema: alias.json
        - desktop.value: body-size-s
        - desktop.uuid: 4140710f-ae31-4ae3-b8b6-2d3eb6a1ae78
        - mobile.schema: alias.json
        - mobile.value: body-size-xs
        - mobile.uuid: f3ba73a4-16ba-44a4-abf2-9893e8f02344
    - `coach-mark-width`
        - uuid: b8c6b0f5-b498-46e3-8fed-b026af86482a
    - `coach-mark-minimum-width`
        - uuid: 53ab0df3-12d4-4460-b5a7-234e40c4456a
    - `coach-mark-maximum-width`
        - uuid: a2fbb90f-b481-49bb-aa87-d67b0144c8c5
    - `coach-mark-edge-to-content`
        - uuid: 41bda81f-182f-46ce-961b-83db9b5211bd
    - `coach-mark-pagination-text-to-bottom-edge`
        - uuid: 2e16deca-76be-472d-97ec-13596db8089d
    - `coach-mark-media-height`
        - uuid: f8ee195f-0b00-41fb-bb76-a22a7f0ccaff
    - `coach-mark-media-minimum-height`
        - uuid: f35ee551-3eab-4650-938d-60b4bb10ec3d
    - `coach-mark-title-size`
        - desktop.schema: alias.json
        - desktop.value: heading-size-xs
        - desktop.uuid: 331604db-3f28-472e-810d-9010ed2c8e33
        - mobile.schema: alias.json
        - mobile.value: heading-size-xxs
        - mobile.uuid: cd4848b6-d560-475a-9d80-f7b5acebce10
    - `coach-mark-body-size`
        - desktop.schema: alias.json
        - desktop.value: body-size-s
        - desktop.uuid: eba9f466-deda-48d5-a120-14419d5a670f
        - mobile.schema: alias.json
        - mobile.value: body-size-xs
        - mobile.uuid: a0abef77-dafe-4158-9faa-a4b4b2871e54
    - `coach-mark-pagination-body-size`
        - desktop.schema: alias.json
        - desktop.value: body-size-s
        - desktop.uuid: df8bc8ae-b6fa-4414-93b7-c89d8097fe11
        - mobile.schema: alias.json
        - mobile.value: body-size-xs
        - mobile.uuid: 350d9235-ff9e-43d7-9298-56b36d58d6de
    - `accordion-top-to-text-regular-small`
        - uuid: aad6a2e4-89ed-4b54-89cb-17643f5cf826
    - `accordion-small-top-to-text-spacious`
        - uuid: 21d37fe2-7897-4071-8f80-9c5ace73c0ea
    - `accordion-top-to-text-regular-medium`
        - uuid: f3aaa4f6-a58d-4612-bbfc-0d4647981067
    - `accordion-top-to-text-spacious-medium`
        - uuid: 666c8b52-bc14-4588-8147-ab11fac0a413
    - `accordion-top-to-text-compact-large`
        - uuid: 861bb30c-d322-4085-b7b5-8c1d1a3d6b02
    - `accordion-top-to-text-regular-large`
        - uuid: 48c043d5-24c8-4ac3-9745-6daa65f21a43
    - `accordion-top-to-text-spacious-large`
        - uuid: c5e08a35-8c56-4b29-8edc-d8fc64a19b0b
    - `accordion-top-to-text-compact-extra-large`
        - uuid: d41f8c32-35e1-49e6-be09-cfd46c2aa064
    - `accordion-top-to-text-regular-extra-large`
        - uuid: d29f4dc3-b39b-46b6-bcec-64e9019d684f
    - `accordion-top-to-text-spacious-extra-large`
        - uuid: 35dd0fbb-b065-4512-aae0-8705b5ead4ca
    - `accordion-bottom-to-text-compact-small`
        - uuid: b74e3f61-5d03-4104-a809-ed5b7fe60611
    - `accordion-bottom-to-text-regular-small`
        - uuid: 46761c4b-8224-48ae-bf79-9672d250e53f
    - `accordion-bottom-to-text-spacious-small`
        - uuid: 0f91dd70-a1c7-487b-a9b3-d6a462bf9e57
    - `accordion-bottom-to-text-compact-medium`
        - uuid: 0cf0f58c-8eea-4a65-8636-4764654d56e8
    - `accordion-bottom-to-text-regular-medium`
        - uuid: d14a70a4-dd33-4e1d-972e-4d453135f675
    - `accordion-bottom-to-text-spacious-medium`
        - uuid: b76125b4-5be8-4324-b182-e6dc70e0e4ff
    - `accordion-bottom-to-text-compact-large`
        - uuid: 866479c6-c08a-452b-80db-0eaab1010f4f
    - `accordion-bottom-to-text-regular-large`
        - uuid: 0d3624d6-e476-49e0-b382-7c66ee070cb2
    - `accordion-bottom-to-text-spacious-large`
        - uuid: ed84ee4f-0bee-4a6d-aca8-68836f140f67
    - `accordion-bottom-to-text-compact-extra-large`
        - uuid: 695fb872-0b52-4477-942e-780e8418bdfe
    - `accordion-bottom-to-text-regular-extra-large`
        - uuid: 733a9bbd-9b08-4a03-add2-defa39fbe9b5
    - `accordion-bottom-to-text-spacious-extra-large`
        - uuid: d8d072e2-ffc8-4211-ac06-6f2ada7c1d68
    - `accordion-minimum-width`
        - uuid: d2ec2861-21dd-4282-b483-abd69bb8ef71
    - `accordion-content-area-top-to-content`
        - uuid: cd059cf7-1eff-4b03-bee5-d254dbd5df30
    - `accordion-content-area-bottom-to-content`
        - uuid: 78c5f8c2-6436-4a5d-a67b-c90f2cd8e47b
    - `color-handle-size`
        - uuid: 1cb8d622-071a-417b-ab40-7350f7bce364
    - `color-handle-size-key-focus`
        - uuid: f94a7f6f-58d8-4d82-b480-843106cbf828
    - `table-column-header-row-top-to-text-small`
        - uuid: f3ebd248-9c8d-4b9e-b6d0-4104f19a64e9
    - `table-column-header-row-top-to-text-medium`
        - uuid: d76f977c-bb72-4f01-9b1c-5b02c205a1ff
    - `table-column-header-row-top-to-text-large`
        - uuid: e15274c0-d45a-4bbb-bf0b-d4e12e85a2b6
    - `table-column-header-row-top-to-text-extra-large`
        - uuid: cf6c2df3-bf95-4612-b40b-95a6c963c3b7
    - `table-column-header-row-bottom-to-text-small`
        - uuid: ecc5e054-dd12-4973-ac05-97ed170b134c
    - `table-column-header-row-bottom-to-text-medium`
        - uuid: c5040d29-5591-4793-847d-0d7123fd1bb8
    - `table-column-header-row-bottom-to-text-large`
        - uuid: cde1eaa9-2146-45fb-b8f6-edfb7ec9cec1
    - `table-column-header-row-bottom-to-text-extra-large`
        - uuid: 046321fc-4bc1-4485-94c3-9a674f30f3d1
    - `table-row-height-small-regular`
        - uuid: 2fdb0923-5abb-4790-a8b0-0667ac31c21f
    - `table-row-height-medium-regular`
        - uuid: e5b206df-476c-4446-ac7b-33a09d199b4e
    - `table-row-height-large-regular`
        - uuid: d736c3fc-f065-4bea-a4a1-9ae94542d919
    - `table-row-height-extra-large-regular`
        - uuid: 71e3db99-d203-4a8f-afe9-f6d278cd2ddf
    - `table-row-height-small-spacious`
        - uuid: 537269dd-f836-402f-8c13-b2c91788f9b5
    - `table-row-height-medium-spacious`
        - uuid: 910487af-814b-4c43-9f7e-4002ff213aa1
    - `table-row-height-large-spacious`
        - uuid: 1d741845-48e9-4e5c-b586-a89b8e4bb1f2
    - `table-row-height-extra-large-spacious`
        - uuid: 20d8ac93-5c81-4d55-bab6-aa2fb0d22a21
    - `table-row-top-to-text-small-regular`
        - uuid: 06fec8c1-0345-4130-befd-723a5cc18a7e
    - `table-row-top-to-text-medium-regular`
        - uuid: d80c3254-92ef-4c3d-ad68-3063a8f904f9
    - `table-row-top-to-text-large-regular`
        - uuid: 55ffc07c-59e6-467f-90bd-6e891bb4f260
    - `table-row-top-to-text-extra-large-regular`
        - uuid: 8ff56511-a776-495a-a8ac-41f565afa951
    - `table-row-bottom-to-text-small-regular`
        - uuid: 1bb628a1-b1e1-436a-93b7-51627275e82b
    - `table-row-bottom-to-text-medium-regular`
        - uuid: 67ccae46-0ae7-4992-ad31-23f148d71702
    - `table-row-bottom-to-text-large-regular`
        - uuid: 12859ac5-346f-464a-afe6-626667d92a8e
    - `table-row-bottom-to-text-extra-large-regular`
        - uuid: 75c1e663-5576-4c04-a9ce-9bfeb8603ee0
    - `table-row-top-to-text-small-spacious`
        - uuid: cb5025d7-86f5-4608-83b1-2e38774450e0
    - `table-row-top-to-text-medium-spacious`
        - uuid: e82e7cd2-161b-4a82-968a-bc80ad68232f
    - `table-row-top-to-text-large-spacious`
        - uuid: 5a5e6db9-7fdf-4883-a306-59df7c8fe461
    - `table-row-top-to-text-extra-large-spacious`
        - uuid: 5d5fdc5d-125b-40ea-805d-c4e6557c386c
    - `table-row-bottom-to-text-small-spacious`
        - uuid: ece055b7-1adf-4361-9f45-b4c2fc3ffa7c
    - `table-row-bottom-to-text-medium-spacious`
        - uuid: 8daea87d-dc45-49c4-a1a4-2b25352b6803
    - `table-row-bottom-to-text-large-spacious`
        - uuid: 6b14dcce-9726-46e0-b524-57031ae5e2ff
    - `table-row-bottom-to-text-extra-large-spacious`
        - uuid: ad376a29-0880-4248-83ba-6ca7a879d656
    - `table-checkbox-to-text`
        - uuid: 067aa068-db38-411f-87ad-760dd6dcdb07
    - `table-header-row-checkbox-to-top-small`
        - uuid: 54338737-e05a-44dc-a2d6-d6bb83ec8165
    - `table-header-row-checkbox-to-top-medium`
        - uuid: d9045503-b75d-4a5f-90b5-d3eddd119649
    - `table-header-row-checkbox-to-top-large`
        - uuid: 6f957e77-84ea-4e0b-882a-c943cb148bb9
    - `table-header-row-checkbox-to-top-extra-large`
        - uuid: fe8df7cb-9796-47fb-ac1c-c98173781049
    - `table-row-checkbox-to-top-small-compact`
        - uuid: 4058d0b0-ef8a-4e58-b7ed-e2c5444e91c0
    - `table-row-checkbox-to-top-small-regular`
        - uuid: 4563310d-c53b-4b39-b5d2-62cbfe5356d9
    - `table-row-checkbox-to-top-small-spacious`
        - uuid: f383d370-a44b-458a-8bd0-4c81eb950354
    - `table-row-checkbox-to-top-medium-compact`
        - uuid: 68f1090f-9c50-4537-87a4-7a27756c977a
    - `table-row-checkbox-to-top-medium-regular`
        - uuid: e0871753-cee6-4b06-8ca9-faa5348a38ee
    - `table-row-checkbox-to-top-medium-spacious`
        - uuid: 3a1bedbe-d6de-4d9e-bc1f-2389dce615c9
    - `table-row-checkbox-to-top-large-compact`
        - uuid: a373d470-cce5-4222-9cdb-3b570018870b
    - `table-row-checkbox-to-top-large-regular`
        - uuid: 3d78defe-7854-4ee6-b6d6-81ac8f6d8854
    - `table-row-checkbox-to-top-large-spacious`
        - uuid: 0360a0ce-7b68-4aca-84e5-916773dc6785
    - `table-row-checkbox-to-top-extra-large-compact`
        - uuid: 494f8ddd-dda5-4ce1-9df4-77992f55db28
    - `table-row-checkbox-to-top-extra-large-regular`
        - uuid: 09aa25e6-1844-45c7-b581-574e21e8c7fd
    - `table-row-checkbox-to-top-extra-large-spacious`
        - uuid: 69b2f2e6-e886-4f13-bbb1-6f0a44ca1296
    - `table-section-header-row-height-small`
        - uuid: 3f58f0b4-9a45-40c4-b6db-5771fb713690
    - `table-section-header-row-height-medium`
        - uuid: 15e952af-a5c8-465c-b260-ae3e1c074fa7
    - `table-section-header-row-height-large`
        - uuid: 35b369fa-8877-4216-b5b6-a4d9100351a4
    - `table-section-header-row-height-extra-large`
        - uuid: 7155693f-4281-47ad-b02c-d8084756590f
    - `table-thumbnail-to-top-minimum-small-compact`
        - uuid: cae9f1fb-d746-41bc-89ba-58d2aeed2bb8
    - `table-thumbnail-to-top-minimum-medium-compact`
        - uuid: 23f99b75-e5a0-4f28-bffc-77c9c3011da9
    - `table-thumbnail-to-top-minimum-large-compact`
        - uuid: 54d5a37b-0edf-4f32-9ad1-794ffaea774b
    - `table-thumbnail-to-top-minimum-extra-large-compact`
        - uuid: d01f46c2-825e-42d4-a1cd-e0f8237833a8
    - `table-thumbnail-to-top-minimum-small-regular`
        - uuid: 0df6024f-a4e7-4705-8640-1b561982b514
    - `table-thumbnail-to-top-minimum-medium-regular`
        - uuid: bfa8f410-1d96-4262-bbc0-11b0829e2b17
    - `table-thumbnail-to-top-minimum-large-regular`
        - uuid: 237eb135-271c-4235-a5b9-a3a697fccf96
    - `table-thumbnail-to-top-minimum-extra-large-regular`
        - uuid: e9a7b195-264b-44ba-b45a-b80b420139bf
    - `table-thumbnail-to-top-minimum-small-spacious`
        - uuid: 210ec248-99f8-4969-a487-0e25140c9431
    - `table-thumbnail-to-top-minimum-medium-spacious`
        - uuid: 2c9a1114-c7d0-4aeb-bd08-61645357d882
    - `table-thumbnail-to-top-minimum-large-spacious`
        - uuid: 43917cdf-4e06-47a2-935c-47cd42a26349
    - `table-thumbnail-to-top-minimum-extra-large-spacious`
        - uuid: 8b294228-b51e-4b2a-b577-4f328170f072
    - `tab-item-to-tab-item-horizontal-small`
        - uuid: bc5ff4f1-ac72-47e1-8423-9f8835043c71
    - `tab-item-to-tab-item-horizontal-medium`
        - uuid: ba8f899f-fa40-4295-92bb-a46d62d891c6
    - `tab-item-to-tab-item-horizontal-large`
        - uuid: 136e9e3b-104d-42a7-9ff3-9a81b82a224f
    - `tab-item-to-tab-item-horizontal-extra-large`
        - uuid: c1bdb5e6-754c-4846-9fb4-f9e748ab47eb
    - `tab-item-to-tab-item-vertical-small`
        - uuid: 26f918df-58db-4c93-b384-24f4eb5787c7
    - `tab-item-to-tab-item-vertical-medium`
        - uuid: f38a8014-9b74-4c18-97b8-a3552b08ba2c
    - `tab-item-to-tab-item-vertical-large`
        - uuid: 76eca7ae-ce9a-4ce2-8efd-b73f76f03f05
    - `tab-item-to-tab-item-vertical-extra-large`
        - uuid: b21c35fc-16d6-4356-941b-dc8eb533d524
    - `tab-item-start-to-edge-small`
        - uuid: 4c91d4af-7738-41ae-884b-f51b96f0277d
    - `tab-item-start-to-edge-medium`
        - uuid: 854c8fee-224a-4fca-aeb1-c770faf5ba22
    - `tab-item-start-to-edge-large`
        - uuid: 31935ef9-f6f2-45f0-b2dc-8fb0a105d243
    - `tab-item-start-to-edge-extra-large`
        - uuid: 98e8e273-af5b-413a-a69e-3f7555275ff8
    - `tab-item-top-to-text-small`
        - uuid: f5774cb8-13a1-4473-a48e-ad31031c6633
    - `tab-item-bottom-to-text-small`
        - uuid: 9fc2a1ef-aadd-4e70-9fda-0b1a4c5e34ef
    - `tab-item-top-to-text-medium`
        - uuid: 76b24ca3-192e-4f08-861d-a85bfaf5785e
    - `tab-item-bottom-to-text-medium`
        - uuid: 440bf748-a58c-46d0-b8b8-9a19e9ee5924
    - `tab-item-top-to-text-large`
        - uuid: 90e17fcf-a054-4aab-828a-bc6a21ab17ca
    - `tab-item-bottom-to-text-large`
        - uuid: 13aa806b-c355-452d-9f9b-c8333a382004
    - `tab-item-top-to-text-extra-large`
        - uuid: 073cc280-e128-49ec-b2d4-372302b1a8a3
    - `tab-item-bottom-to-text-extra-large`
        - uuid: 22c953eb-cfd6-469a-b175-3d08edca39e9
    - `tab-item-top-to-text-compact-small`
        - uuid: 5a89fcc8-eb6d-49e0-bf9a-50dd94c2e7b9
    - `tab-item-bottom-to-text-compact-small`
        - uuid: 44fbab39-742f-47ec-8135-b216b7302f1f
    - `tab-item-top-to-text-compact-medium`
        - uuid: 0500b8b8-0ccb-469f-aff4-e2a0de12c30d
    - `tab-item-bottom-to-text-compact-medium`
        - uuid: 95b1b803-d8d8-4b6d-8cf1-95cd0031acb9
    - `tab-item-top-to-text-compact-large`
        - uuid: 3e5acee9-a5c2-4f95-9588-bd11c42a943c
    - `tab-item-bottom-to-text-compact-large`
        - uuid: b03a5d23-f5d5-44d0-9228-3dc0aad65db5
    - `tab-item-top-to-text-compact-extra-large`
        - uuid: 160a6ac0-ee42-4d75-85db-f5e80c8dacc4
    - `tab-item-bottom-to-text-compact-extra-large`
        - uuid: 4b84c709-39e5-4a23-b1eb-d816e3d14ac7
    - `tab-item-top-to-workflow-icon-small`
        - uuid: 6e4ff6be-da6e-48ca-bb60-99825f5c0f7e
    - `tab-item-top-to-workflow-icon-medium`
        - uuid: 30fd4757-40b5-4e1d-8f56-d544a730f7e1
    - `tab-item-top-to-workflow-icon-large`
        - uuid: ad9470a2-2e7e-4141-a6fb-8bd83adeea4b
    - `tab-item-top-to-workflow-icon-extra-large`
        - uuid: 2be3d88a-12d9-439a-bccc-c4ec1e15bb2e
    - `tab-item-top-to-workflow-icon-compact-small`
        - uuid: 7e860824-a86c-46a8-b274-20e3eb477a06
    - `tab-item-top-to-workflow-icon-compact-medium`
        - uuid: ffe8f0c4-10ca-4ce3-b2e7-9b247041d641
    - `tab-item-top-to-workflow-icon-compact-large`
        - uuid: 11bb3829-22fa-4b5b-a59c-b66be83711d0
    - `tab-item-top-to-workflow-icon-compact-extra-large`
        - uuid: 3d9343a7-3027-4827-b42b-6068016bddf8
    - `tab-item-focus-indicator-gap-small`
        - uuid: ef063e8e-7195-4364-bf75-768d2511949d
    - `tab-item-focus-indicator-gap-medium`
        - uuid: 112a9064-c13c-4f0f-b380-2b477f9c8e15
    - `tab-item-focus-indicator-gap-large`
        - uuid: f65bf525-647b-4e29-b0d1-8890511683f8
    - `tab-item-focus-indicator-gap-extra-large`
        - uuid: fec20eb3-b977-442f-92d5-51ab0b4967c9
    - `side-navigation-width`
        - uuid: eb372bca-78b4-48fa-9ff3-887a7f3c72f8
    - `side-navigation-minimum-width`
        - uuid: 51f92ad9-076e-4a1e-a489-ac53cc36f038
    - `side-navigation-maximum-width`
        - uuid: d40a2a35-1b20-4be9-afd7-8cfb701faf73
    - `side-navigation-second-level-edge-to-text`
        - uuid: 27097ca6-f105-41cb-822f-5d48e3ea19d6
    - `side-navigation-third-level-edge-to-text`
        - uuid: 8803e38f-c87b-4c5c-8ae5-c8cbcd5ac6ff
    - `side-navigation-with-icon-second-level-edge-to-text`
        - uuid: 6a179e98-012f-449f-97a5-dd9e3532b8a5
    - `side-navigation-with-icon-third-level-edge-to-text`
        - uuid: be255625-c2d5-4d63-9823-c1b82c2123f7
    - `side-navigation-item-to-item`
        - uuid: 6d798f26-dbfa-4c26-9d27-4f3b05f33cc4
    - `side-navigation-item-to-header`
        - uuid: 1ceea2e6-fb64-423c-95a7-4406cc6ce849
    - `side-navigation-header-to-item`
        - uuid: 52645387-83e9-46d4-8d7f-4a4533ee5179
    - `side-navigation-bottom-to-text`
        - uuid: 0727c8a6-d58d-41e8-8bdc-3a98ff811200
    - `tray-top-to-content-area`
        - uuid: f1641c53-fc37-4eeb-ac30-3c5131ed0233
    - `in-field-button-fill-stacked-inner-border-rounding`
        - spectrum.schema: dimension.json
        - spectrum.value: 0px
        - spectrum.uuid: f8ed9a70-58f1-4f1a-9e87-24bca6d7b4e1
        - express.schema: dimension.json
        - express.value: 1px
        - express.uuid: 5a3e434f-f915-4a72-985b-04af51c3ad7e
    - `in-field-button-edge-to-fill`
        - spectrum.schema: dimension.json
        - spectrum.value: 0px
        - spectrum.uuid: 5bffe992-2982-49e8-aa3a-e4e93c884f43
        - express.schema: dimension.json
        - express.value: 4px
        - express.uuid: 670a4fef-5e16-4db6-8acd-b747cc783312
    - `in-field-button-stacked-inner-edge-to-fill`
        - spectrum.schema: dimension.json
        - spectrum.value: 0px
        - spectrum.uuid: 56b54ece-0ff3-4957-9c1c-9e7fb992653c
        - express.schema: dimension.json
        - express.value: 1px
        - express.uuid: c1aa585e-769d-40d6-a42d-c9d602124870
    - `in-field-button-outer-edge-to-disclosure-icon-stacked-medium`
        - spectrum.schema: dimension.json
        - spectrum.value: 3px
        - spectrum.uuid: a87d68bb-4249-43cd-947d-bd061baba0ef
        - express.schema: dimension.json
        - express.value: 5px
        - express.uuid: b942ec2c-f70f-4948-8ff5-0bd471cd4f0a
    - `in-field-button-outer-edge-to-disclosure-icon-stacked-large`
        - spectrum.schema: dimension.json
        - spectrum.value: 4px
        - spectrum.uuid: acc9c48a-f461-48ff-9f69-0224c4feabc6
        - express.schema: dimension.json
        - express.value: 7px
        - express.uuid: 345002c5-88fc-4297-aa91-54ed292265b8
    - `in-field-button-outer-edge-to-disclosure-icon-stacked-extra-large`
        - spectrum.schema: dimension.json
        - spectrum.value: 5px
        - spectrum.uuid: 391e1e67-1677-4f60-a09a-3b49bacd01f5
        - express.schema: dimension.json
        - express.value: 8px
        - express.uuid: 33e443d8-3e31-4f17-ab37-61beebaa9d40
    - `in-field-button-inner-edge-to-disclosure-icon-stacked-small`
        - spectrum.schema: alias.json
        - spectrum.value: in-field-button-outer-edge-to-disclosure-icon-stacked-small
        - spectrum.uuid: 6c1330a4-1c89-45a7-b2b1-8cbcaf20b9ab
        - express.schema: dimension.json
        - express.value: 1px
        - express.uuid: ec74220b-c091-4b29-8e43-9d3f0e163820
    - `in-field-button-inner-edge-to-disclosure-icon-stacked-medium`
        - spectrum.schema: alias.json
        - spectrum.value: in-field-button-outer-edge-to-disclosure-icon-stacked-medium
        - spectrum.uuid: 3dd5babb-5026-4f28-89ae-bfe687673f31
        - express.schema: dimension.json
        - express.value: 1px
        - express.uuid: 5bddcd79-3829-4764-853a-b83512b5820d
    - `in-field-button-inner-edge-to-disclosure-icon-stacked-large`
        - spectrum.schema: alias.json
        - spectrum.value: in-field-button-outer-edge-to-disclosure-icon-stacked-large
        - spectrum.uuid: 710ebe58-f0d8-4d6b-8974-0be1f2f48dc4
        - express.schema: dimension.json
        - express.value: 3px
        - express.uuid: 7135afd9-ef05-4909-8b3e-eeae3d527bd0
    - `in-field-button-inner-edge-to-disclosure-icon-stacked-extra-large`
        - spectrum.schema: alias.json
        - spectrum.value: in-field-button-outer-edge-to-disclosure-icon-stacked-extra-large
        - spectrum.uuid: c47499c1-b89f-49a7-bbb5-17e83e4b306e
        - express.schema: dimension.json
        - express.value: 4px
        - express.uuid: 979542c9-2328-495c-8abf-cb226b140f82
    - `accordion-top-to-text-spacious-small`
        - uuid: bdf7a208-dbfa-4a66-9138-baec261d2908
    - `body-cjk-size-xxxl`
        - component: body
    - `body-cjk-size-xxl`
        - component: body
    - `body-cjk-size-xl`
        - component: body
    - `body-cjk-size-l`
        - component: body
    - `body-cjk-size-m`
        - component: body
    - `body-cjk-size-s`
        - component: body
    - `body-cjk-size-xs`
        - component: body
    - `icon-color-blue-primary-default`
        - darkest.schema: alias.json
        - darkest.value: blue-800
        - darkest.uuid: 1bac9a3f-4bc8-4a4d-8dfd-53c542b1d1d8
        - uuid: a52ced5f-2e8d-4ab9-bddb-fbbf32860256
    - `icon-color-green-primary-default`
        - light.schema: alias.json
        - light.value: green-900
        - light.uuid: a0717159-cc62-4ba1-b1f1-a69dfb88c6ee
        - dark.schema: alias.json
        - dark.value: green-800
        - dark.uuid: ce9c0ea4-0c5a-4d3b-974f-1b9acf27b3fd
        - darkest.schema: alias.json
        - darkest.value: green-800
        - darkest.uuid: 260ff567-2bdb-48cc-9576-f4f7629d3a8f
        - wireframe.schema: alias.json
        - wireframe.value: green-900
        - wireframe.uuid: d6852796-baaa-4f95-9ce7-cc2fd5a829f1
    - `icon-color-red-primary-default`
        - darkest.schema: alias.json
        - darkest.value: red-700
        - darkest.uuid: a60f2744-ad15-4cf7-b9dc-89ca307ed444
        - uuid: 5b809bc6-8ac3-4ec1-a7bb-b88863b1905b
    - `icon-color-yellow-primary-default`
        - darkest.schema: alias.json
        - darkest.value: yellow-1000
        - darkest.uuid: 5ebf8291-23f8-4806-865d-4ebab38ff03c
        - uuid: 52b34bcf-a2dc-41a4-855c-0a786a234d5d
    - `workflow-icon-size-50`
        - component: icon
        - uuid: 1e2f7368-9813-4cda-aa32-a2d0bc03f41c
    - `workflow-icon-size-75`
        - component: icon
        - uuid: b2effa58-727a-4a52-8680-296b0f83f0aa
    - `workflow-icon-size-100`
        - component: icon
        - uuid: 1ac9ea9c-59ab-41f7-966e-f1b5c290e4a1
    - `workflow-icon-size-200`
        - component: icon
        - uuid: e8863648-66c4-4ffa-8aa2-53f91ca331c7
    - `workflow-icon-size-300`
        - component: icon
        - uuid: 7d699674-dab8-4f5b-a022-51dc67b7fc45
    - `arrow-icon-size-75`
        - uuid: ec025bb5-a58e-486b-98f5-c8c2fde55a0a
    - `arrow-icon-size-100`
        - uuid: 2c9e49ab-e572-4ed5-90d0-5213dff5fec6
    - `arrow-icon-size-200`
        - uuid: a18e9723-eb3b-470c-82d8-b3544bf587d7
    - `arrow-icon-size-300`
        - uuid: fd4b3d4e-a9e9-4448-881a-9bd7fcda991a
    - `arrow-icon-size-400`
        - uuid: 9101e9df-cc20-44b1-b183-8d9ac7146f0d
    - `arrow-icon-size-500`
        - uuid: b86d209f-21d1-4c61-9c89-010b676f8389
    - `arrow-icon-size-600`
        - uuid: ac841dee-47e8-47f3-b2b2-add8b4333eba
    - `asterisk-icon-size-100`
        - uuid: bcd47b11-a4b1-4b1b-a082-36c3554d0eef
    - `asterisk-icon-size-200`
        - uuid: 8e6912ef-2ee2-4048-85e7-c758f2d0cced
    - `asterisk-icon-size-300`
        - uuid: 65b34b9b-ddfa-4cbd-bfb4-56bcc60eca86
    - `checkmark-icon-size-50`
        - uuid: 968c7096-a064-444f-a449-6388bef7b74b
    - `checkmark-icon-size-75`
        - uuid: 15df2603-7450-461b-b042-c952a90f65e5
    - `checkmark-icon-size-100`
        - uuid: 9203c333-afaf-484d-8f4a-d26e6d88e70a
    - `checkmark-icon-size-200`
        - uuid: c81d8bc2-63b7-4416-9451-0d6030d10c56
    - `checkmark-icon-size-300`
        - uuid: e05fceb5-a187-465f-951b-c39d047603ca
    - `checkmark-icon-size-400`
        - uuid: 8e9669a7-42aa-4f03-a7fd-39fb0a0cdc74
    - `checkmark-icon-size-500`
        - uuid: 43df0124-93a2-4014-934f-2919b4849ec1
    - `checkmark-icon-size-600`
        - uuid: c4a6e802-723f-4198-80a3-0c70ae5c8a8c
    - `chevron-icon-size-50`
        - uuid: 40f343b7-daf4-499e-8183-0140eb5bcedd
    - `chevron-icon-size-75`
        - uuid: c53d444c-71c2-4b59-81ee-b2e0af7911c6
    - `chevron-icon-size-100`
        - uuid: f3f0a237-be83-48c7-9048-6e63b164d456
    - `chevron-icon-size-200`
        - uuid: 34006e8c-3325-43cd-b1d6-b338b6237956
    - `chevron-icon-size-300`
        - uuid: e00b08d9-9137-4f4b-9387-51ec17b391d3
    - `chevron-icon-size-400`
        - uuid: c8b087cf-ad51-4d46-9dfe-ac2617942edd
    - `chevron-icon-size-500`
        - uuid: c39f4b1b-967f-463f-880a-f6ba523fbcf3
    - `chevron-icon-size-600`
        - uuid: 5221f3ca-cc93-4b2e-ab74-35da255866ca
    - `corner-triangle-icon-size-75`
        - component: icon
        - uuid: bed0e624-9aa1-403a-b1cc-74c6afb84647
    - `corner-triangle-icon-size-100`
        - component: icon
        - uuid: 1c3e00ad-6915-470a-b34a-853c88844cbc
    - `corner-triangle-icon-size-200`
        - component: icon
        - uuid: 0ff629b0-fcb9-4aee-9cde-68df68825de9
    - `corner-triangle-icon-size-300`
        - component: icon
        - uuid: 09f106e8-600f-4868-984a-61e3b65a735e
    - `cross-icon-size-75`
        - uuid: e426da6e-cf18-4f5d-8ba1-218f3ec51973
    - `cross-icon-size-100`
        - uuid: 4d4a0ad7-d306-44fd-9492-0b30e62eca8c
    - `cross-icon-size-200`
        - uuid: b5324225-dbca-4fb7-a2d7-48b200c99f58
    - `cross-icon-size-300`
        - uuid: 40c2d521-24a5-401a-8166-eb6f6635f46d
    - `cross-icon-size-400`
        - uuid: eac365fd-a811-47ab-9838-79b12db6d2b5
    - `cross-icon-size-500`
        - uuid: b2eff754-cfc5-4247-91b7-2f569c0114dd
    - `cross-icon-size-600`
        - uuid: 12fbc1b3-926f-419e-99f7-e42c7872c129
    - `dash-icon-size-50`
        - uuid: f2859e6e-1d89-4b64-8d4d-dcfb11445164
    - `dash-icon-size-75`
        - uuid: 0faea762-5ba2-4cd7-903c-776daa0cba6c
    - `dash-icon-size-100`
        - uuid: 235518f5-3ded-4eaa-82e9-881cc76d2d02
    - `dash-icon-size-200`
        - uuid: 45c3cf40-7250-4f8a-b25c-43550025fe8b
    - `dash-icon-size-300`
        - uuid: 0296d5a8-5022-43e0-91f4-465a174c0e33
    - `dash-icon-size-400`
        - uuid: 1967fd56-e60c-4994-ad5a-d84dc0f9c58f
    - `dash-icon-size-500`
        - uuid: 5ae4eccd-7555-40c5-a59f-b17964d949ff
    - `dash-icon-size-600`
        - uuid: dc69f825-b868-4533-8ecc-1c17b4326f82
    - `gray-50`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 0, 0)
        - darkest.uuid: 0913be1e-b648-4b80-9976-fd8e5e53f4fc
        - uuid: f668a787-a8e4-4d8f-861b-1ff7bd128793
    - `gray-75`
        - darkest.schema: color.json
        - darkest.value: rgb(14, 14, 14)
        - darkest.uuid: 1666d544-ad1b-445a-9a57-d2277fb752eb
        - uuid: a8999689-c198-4d38-bbff-57fc217e7922
    - `gray-100`
        - darkest.schema: color.json
        - darkest.value: rgb(29, 29, 29)
        - darkest.uuid: abd011c4-87a5-4b1f-82e2-e94d118f417f
        - uuid: 55a0effe-1758-4b2f-908c-d36e460880b8
    - `gray-200`
        - darkest.schema: color.json
        - darkest.value: rgb(48, 48, 48)
        - darkest.uuid: 0a676e7a-8a89-4607-a918-3abcfb0234a2
        - uuid: 067d4f1e-c9cb-42f4-a108-cb5ded87f014
    - `gray-300`
        - darkest.schema: color.json
        - darkest.value: rgb(75, 75, 75)
        - darkest.uuid: cc8c4299-c40d-4e93-80b2-c052ee8aaf40
        - uuid: 87708b3e-3407-4fb2-adc3-a8a1127a82b1
    - `gray-400`
        - darkest.schema: color.json
        - darkest.value: rgb(106, 106, 106)
        - darkest.uuid: c34dd99f-e576-4c98-a89d-86dd47514c55
        - uuid: a3d15bb5-3d17-4d5b-b7a6-f0b3b9d6bead
    - `gray-500`
        - darkest.schema: color.json
        - darkest.value: rgb(141, 141, 141)
        - darkest.uuid: 05808575-f14b-49d1-aefb-e3667ec0f5a4
        - uuid: f413727c-d46a-4d66-a8a3-4b2dccd6efd8
    - `gray-600`
        - darkest.schema: color.json
        - darkest.value: rgb(176, 176, 176)
        - darkest.uuid: 8880b8f1-7850-49ef-a7ab-fd4e16cb37a6
        - uuid: 089feb70-0076-4745-ad5b-6edd6961caf6
    - `gray-700`
        - darkest.schema: color.json
        - darkest.value: rgb(208, 208, 208)
        - darkest.uuid: 3cc563c6-386e-4b08-850d-68d4a292e559
        - uuid: e8af5fd3-3237-483a-bca2-79c3e19c8cef
    - `gray-800`
        - darkest.schema: color.json
        - darkest.value: rgb(235, 235, 235)
        - darkest.uuid: d39fc368-ec71-40cd-85e9-afb07862f2b7
        - uuid: 5a77ca5d-b4b4-4ca9-bceb-b5fcd4a84edd
    - `gray-900`
        - darkest.schema: color.json
        - darkest.value: rgb(255, 255, 255)
        - darkest.uuid: 90d25d68-afb1-4b2a-9dba-3fe22d44976f
        - uuid: 78316eb8-0e0f-411a-8ff0-496e24d0c9b5
    - `blue-100`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 38, 81)
        - darkest.uuid: 7d56ac58-fd58-41b3-9bbd-448ae0a7dd85
        - uuid: 64f3815b-e429-43f6-8a1c-4049f0f1722d
    - `blue-200`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 50, 106)
        - darkest.uuid: 7b7d1fd8-cc1e-4053-b320-e481b8f64c46
        - uuid: 7e952162-5ef5-45d4-ae14-ebef50162185
    - `blue-300`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 64, 135)
        - darkest.uuid: d88d1685-29dc-486b-a0b9-9c90f60b8cde
        - uuid: 3413a337-7b3c-4200-8423-42954df37461
    - `blue-400`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 78, 166)
        - darkest.uuid: 29d339bb-ef80-40f8-a69b-afa778b60805
        - uuid: 7c9368b4-a2ac-490f-95a4-c2d506a2f064
    - `blue-500`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 92, 200)
        - darkest.uuid: a61ed901-7f77-4667-9d19-fff6bab20623
        - uuid: 30ba29dc-5f28-47c7-b41f-2156c8943040
    - `blue-600`
        - darkest.schema: color.json
        - darkest.value: rgb(6, 108, 231)
        - darkest.uuid: 7e770996-780a-4494-91ea-08c1ae6cfa80
        - uuid: fbd8fd2c-91bc-4531-86cc-cc71aba419d2
    - `blue-700`
        - darkest.schema: color.json
        - darkest.value: rgb(29, 128, 245)
        - darkest.uuid: 5cc66280-e13a-459d-8529-c3f531aa5e4e
        - uuid: 003abb20-2cf8-4c48-ae35-bdff79ae6a02
    - `blue-800`
        - darkest.schema: color.json
        - darkest.value: rgb(64, 150, 243)
        - darkest.uuid: cf0bafc5-f5c6-4986-a17a-6660dc542b71
        - uuid: 1473440e-654c-4475-81da-7e7e296ddebc
    - `blue-900`
        - darkest.schema: color.json
        - darkest.value: rgb(94, 170, 247)
        - darkest.uuid: 82b09b04-6a70-4a95-9eb5-a321a66a6465
        - uuid: e6b19f4c-0cc5-49cb-ac33-a7327b488d72
    - `blue-1000`
        - darkest.schema: color.json
        - darkest.value: rgb(124, 189, 250)
        - darkest.uuid: 147ed079-b4f0-4cd7-89cd-7ec93750d688
        - uuid: 14fc0f42-79ab-4637-b6f6-921c857a3f13
    - `blue-1100`
        - darkest.schema: color.json
        - darkest.value: rgb(152, 206, 253)
        - darkest.uuid: 2a5d2e32-930d-4c50-b1fd-6781a1dc1db5
        - uuid: d7935092-948a-4b48-be57-5ddf286cd351
    - `blue-1200`
        - darkest.schema: color.json
        - darkest.value: rgb(179, 222, 254)
        - darkest.uuid: ce7da4ba-77ed-4bdd-a154-90f389af6c2a
        - uuid: 3879055d-bec5-4f5c-a0e0-0380fbdb4951
    - `blue-1300`
        - darkest.schema: color.json
        - darkest.value: rgb(206, 234, 255)
        - darkest.uuid: 2bc63c0d-691c-4cc4-95b6-b4e530a44978
        - uuid: e77e1e22-2ca0-4407-80ce-128a26d89f4d
    - `blue-1400`
        - darkest.schema: color.json
        - darkest.value: rgb(227, 243, 255)
        - darkest.uuid: eb86d777-ec23-47e4-adc6-1203709dc00d
        - uuid: d79a2f66-b8e2-42ed-a886-8e3c44e9602f
    - `red-100`
        - darkest.schema: color.json
        - darkest.value: rgb(87, 0, 0)
        - darkest.uuid: 04f6044b-d0fa-4705-858c-2dc5721ec30f
        - uuid: 63b6ddb1-97f3-47eb-863b-c101d55591d6
    - `red-200`
        - darkest.schema: color.json
        - darkest.value: rgb(110, 0, 0)
        - darkest.uuid: b18ca77b-898e-4e09-88e2-8901de3e9172
        - uuid: 31028ec2-bbf8-4236-a420-94c9912f8049
    - `red-300`
        - darkest.schema: color.json
        - darkest.value: rgb(138, 0, 0)
        - darkest.uuid: fcfcf026-be31-4a05-b833-6757cacb8b05
        - uuid: d70696c6-3143-423f-85c7-1b6514eac5af
    - `red-400`
        - darkest.schema: color.json
        - darkest.value: rgb(167, 0, 0)
        - darkest.uuid: 8f9fa135-5aca-4e42-b247-fdfbf74bc07b
        - uuid: 0a243ca7-4175-42f5-bc07-c9b19f938dda
    - `red-500`
        - darkest.schema: color.json
        - darkest.value: rgb(196, 7, 6)
        - darkest.uuid: ec50a21c-88aa-41a8-b607-c8b1c407ac4f
        - uuid: 6a43e349-9df3-4f24-bebf-9c1c758839df
    - `red-600`
        - darkest.schema: color.json
        - darkest.value: rgb(221, 33, 24)
        - darkest.uuid: ff0fa040-17d6-4570-84b5-7a88c5bb9f45
        - uuid: 00fcc1d7-499a-460a-8c15-238e7a558dc2
    - `red-700`
        - darkest.schema: color.json
        - darkest.value: rgb(238, 67, 49)
        - darkest.uuid: cb2486de-b2be-45e5-b459-6e371b29d357
        - uuid: 0e90c785-081e-4116-9c31-f045cddb4e36
    - `red-800`
        - darkest.schema: color.json
        - darkest.value: rgb(249, 99, 76)
        - darkest.uuid: 9ff36ad0-608e-46a7-ab56-00af3d307d83
        - uuid: 5fd887b0-a9c5-4e5a-a7fe-194ab7bc920b
    - `red-900`
        - darkest.schema: color.json
        - darkest.value: rgb(255, 129, 107)
        - darkest.uuid: ccb79099-59f4-4bf2-b149-0de72f556a45
        - uuid: 5666d2b9-014c-43af-93f3-7f8583ad9818
    - `red-1000`
        - darkest.schema: color.json
        - darkest.value: rgb(255, 158, 140)
        - darkest.uuid: 95621c5a-1768-4707-a2ce-bd15c61c89f4
        - uuid: 9f512db1-5b41-47d9-a4a9-1f3d0748b1f5
    - `red-1100`
        - darkest.schema: color.json
        - darkest.value: rgb(255, 183, 169)
        - darkest.uuid: 53617d38-1075-4b47-87c7-4695b385a2d7
        - uuid: d1af4f1a-2e93-4f79-bec7-1a406155b376
    - `red-1200`
        - darkest.schema: color.json
        - darkest.value: rgb(255, 205, 195)
        - darkest.uuid: e7820c1c-ff58-431d-b521-b81ee3281db0
        - uuid: c44f2505-e3fe-4bc7-87ba-7a2260510a1e
    - `red-1300`
        - darkest.schema: color.json
        - darkest.value: rgb(255, 223, 217)
        - darkest.uuid: 7691bca6-3749-4cb7-a950-a94fe3d2910f
        - uuid: f89b3056-071e-4fc4-aec6-562c5d51d030
    - `red-1400`
        - darkest.schema: color.json
        - darkest.value: rgb(255, 237, 234)
        - darkest.uuid: aaafa24c-cb3c-48cd-9cb7-e164be140ab5
        - uuid: b4e9ab89-23c0-41cf-aad5-cf2f2e47e5b7
    - `orange-100`
        - darkest.schema: color.json
        - darkest.value: rgb(72, 24, 1)
        - darkest.uuid: 974ab8ec-6691-4696-b38c-77e16fb3df88
        - uuid: 784a858d-b646-41d6-9a3f-95d849ec14eb
    - `orange-200`
        - darkest.schema: color.json
        - darkest.value: rgb(92, 32, 0)
        - darkest.uuid: 587d4ce3-4275-4d2a-916c-2b1bf78c38ea
        - uuid: 78415dd1-bbc2-4617-ad02-d56b1b76c73c
    - `orange-300`
        - darkest.schema: color.json
        - darkest.value: rgb(115, 43, 0)
        - darkest.uuid: 74f40bbb-5afd-4c88-89d3-e69de9e2b604
        - uuid: 22a43dda-14cb-41ba-8e53-cc4de56197eb
    - `orange-400`
        - darkest.schema: color.json
        - darkest.value: rgb(138, 55, 0)
        - darkest.uuid: b912089a-b6c9-49ef-8a4b-0a1f6fbbe963
        - uuid: cfb5b180-7420-41db-896c-6873ba57edd0
    - `orange-500`
        - darkest.schema: color.json
        - darkest.value: rgb(162, 68, 0)
        - darkest.uuid: 8a56b352-d7d4-45d4-b403-448557656dab
        - uuid: f1eb78b7-92cd-4189-8e7c-9019318a04a7
    - `orange-600`
        - darkest.schema: color.json
        - darkest.value: rgb(186, 82, 0)
        - darkest.uuid: 27b198b5-bf02-476a-a440-84c9a5bd2ce3
        - uuid: 5afdf7f9-54d8-4737-b176-38244d1ce584
    - `orange-700`
        - darkest.schema: color.json
        - darkest.value: rgb(210, 98, 0)
        - darkest.uuid: f9e84513-57d6-4786-b8db-c86055cebfc6
        - uuid: c5651842-f13e-4498-9ce4-39ed84ef20ad
    - `orange-800`
        - darkest.schema: color.json
        - darkest.value: rgb(232, 116, 0)
        - darkest.uuid: 5a88ed4e-94f9-4533-ab13-3995b5a60a5a
        - uuid: 7a6946d1-8048-4853-a550-3fd972fdb72d
    - `orange-900`
        - darkest.schema: color.json
        - darkest.value: rgb(249, 137, 23)
        - darkest.uuid: 0fbe4f46-02a8-444d-ace5-c245c6f15112
        - uuid: b742d374-2071-49df-96f1-49b299c21576
    - `orange-1000`
        - darkest.schema: color.json
        - darkest.value: rgb(255, 162, 59)
        - darkest.uuid: 92e06ff6-8347-4320-9a98-3054ba458d0e
        - uuid: c8fd1b70-72be-48b7-be8a-984436124058
    - `orange-1100`
        - darkest.schema: color.json
        - darkest.value: rgb(255, 188, 102)
        - darkest.uuid: a571e2cd-2aff-4344-b608-45a48162cb61
        - uuid: b1213a46-91c5-43ff-a7a9-3fe96af0eb2e
    - `orange-1200`
        - darkest.schema: color.json
        - darkest.value: rgb(253, 210, 145)
        - darkest.uuid: 8e3fe8e0-2b14-4331-869f-de2680ea60ac
        - uuid: a0d46435-9054-4cd0-a5c8-8bf28187fb6d
    - `orange-1300`
        - darkest.schema: color.json
        - darkest.value: rgb(255, 226, 181)
        - darkest.uuid: 06afaefe-7e0a-42e2-99b5-e62674e1185d
        - uuid: fef49d65-c699-4ff9-8265-b2041c08b2be
    - `orange-1400`
        - darkest.schema: color.json
        - darkest.value: rgb(255, 239, 213)
        - darkest.uuid: 9f2f551f-b606-48ce-9493-888587d3ccb6
        - uuid: f7a380d3-111d-442f-8e78-1d7cce68a4c2
    - `yellow-100`
        - darkest.schema: color.json
        - darkest.value: rgb(53, 36, 0)
        - darkest.uuid: 7bef094a-1523-4392-a0ca-59c48409f17a
        - uuid: c2803c8b-9e53-44cc-8f9a-dd7209191e2f
    - `yellow-200`
        - darkest.schema: color.json
        - darkest.value: rgb(68, 47, 0)
        - darkest.uuid: f4fdc925-63b3-4670-9f2b-a057c27c834a
        - uuid: b80b77ef-cbb2-4797-8bda-b67ff8330266
    - `yellow-300`
        - darkest.schema: color.json
        - darkest.value: rgb(86, 62, 0)
        - darkest.uuid: 238147c6-0302-4d43-b3a3-42df832c7857
        - uuid: 58a5ecc2-e5c3-4597-a366-cfece993fd1c
    - `yellow-400`
        - darkest.schema: color.json
        - darkest.value: rgb(103, 77, 0)
        - darkest.uuid: 62ab6892-66ea-4b55-8c1a-fcc191d29717
        - uuid: 5211b5e1-262a-440b-900e-6417b7c071d3
    - `yellow-500`
        - darkest.schema: color.json
        - darkest.value: rgb(122, 92, 0)
        - darkest.uuid: efa1fdd8-4478-411a-892c-0ecf23939489
        - uuid: 934f56c9-7533-4f7b-8843-6e0660e7fda2
    - `yellow-600`
        - darkest.schema: color.json
        - darkest.value: rgb(141, 108, 0)
        - darkest.uuid: 8ae3c5ec-aabe-47a0-b822-ba0907e67ed4
        - uuid: 3fa9447b-781c-4964-b78e-9fc3f5d6c340
    - `yellow-700`
        - darkest.schema: color.json
        - darkest.value: rgb(161, 126, 0)
        - darkest.uuid: ac3e5d40-51eb-45aa-b4e0-87d3f6e8e359
        - uuid: 4a0220b0-9dd5-425d-b70d-3e4611052750
    - `yellow-800`
        - darkest.schema: color.json
        - darkest.value: rgb(180, 144, 0)
        - darkest.uuid: 67e8d9aa-d843-4536-9c97-bd51e62da8ee
        - uuid: c2faf691-90e9-4f40-8998-0222a97275ca
    - `yellow-900`
        - darkest.schema: color.json
        - darkest.value: rgb(199, 162, 0)
        - darkest.uuid: a12f6cac-7fdc-4fd4-8120-ad957823ff6b
        - uuid: f2f9cb7f-4199-4e1f-bc6e-b04010685168
    - `yellow-1000`
        - darkest.schema: color.json
        - darkest.value: rgb(216, 181, 0)
        - darkest.uuid: 4cf4a500-37a2-4dd8-a243-14f6c012b53c
        - uuid: 91d01994-882d-42f0-b0a0-6f604b6ea8a6
    - `yellow-1100`
        - darkest.schema: color.json
        - darkest.value: rgb(233, 199, 0)
        - darkest.uuid: 4eee9daf-e19d-4e0b-b12d-4fdcc4852956
        - uuid: 70cb2f4b-6bab-4456-a012-8367a77eb7e8
    - `yellow-1200`
        - darkest.schema: color.json
        - darkest.value: rgb(247, 216, 4)
        - darkest.uuid: 69059dfa-e2e1-4f8d-b06b-058a8724e071
        - uuid: 00a1fbb6-cd56-4ab8-bf94-b2745ddc39b9
    - `yellow-1300`
        - darkest.schema: color.json
        - darkest.value: rgb(249, 233, 97)
        - darkest.uuid: b2a1039c-cbfe-44bf-a0fe-822c5f576f52
        - uuid: cf7a2ece-3af0-4aab-a962-f67f8cc5bab6
    - `yellow-1400`
        - darkest.schema: color.json
        - darkest.value: rgb(252, 243, 170)
        - darkest.uuid: dfd355e7-82fd-4fdb-96bd-b584d7268ee9
        - uuid: 80fcfe42-83d1-4e14-87d7-b38f8188ce5f
    - `chartreuse-100`
        - darkest.schema: color.json
        - darkest.value: rgb(32, 43, 0)
        - darkest.uuid: bdc6a473-3109-44c6-9e2f-198d3224d75f
        - uuid: b880507f-8faa-4f95-a45f-ff4c9cd8b7b1
    - `chartreuse-200`
        - darkest.schema: color.json
        - darkest.value: rgb(42, 56, 0)
        - darkest.uuid: b18f4550-5bbe-496c-b4a5-13df8fd0c7d7
        - uuid: 700ac2a7-ddab-4404-9b10-17f863397f25
    - `chartreuse-300`
        - darkest.schema: color.json
        - darkest.value: rgb(54, 72, 0)
        - darkest.uuid: b98dec90-df71-4593-946d-91df7918caac
        - uuid: b99d76b0-0200-438c-8d4a-96d8b2d19efd
    - `chartreuse-400`
        - darkest.schema: color.json
        - darkest.value: rgb(66, 88, 0)
        - darkest.uuid: 6a974b7d-ccd2-4778-baae-8caf419a529c
        - uuid: d625422a-c661-4e4a-9c44-4be8d7380566
    - `chartreuse-500`
        - darkest.schema: color.json
        - darkest.value: rgb(79, 105, 0)
        - darkest.uuid: 46d8fd3b-0e51-4cdd-a33c-de184b82dcc5
        - uuid: 4e2b8114-d24d-44aa-8b71-e0217428027a
    - `chartreuse-600`
        - darkest.schema: color.json
        - darkest.value: rgb(93, 123, 0)
        - darkest.uuid: 965174d2-e743-41df-a8e2-570b2ae2f447
        - uuid: f9fc8b5a-cc95-4fe2-b56a-6d98fad434e9
    - `chartreuse-700`
        - darkest.schema: color.json
        - darkest.value: rgb(107, 142, 0)
        - darkest.uuid: a615bb51-0249-4201-b1c9-1c6269b82ec2
        - uuid: 3d1ba440-370e-4594-b535-7a3e25c04fc4
    - `chartreuse-800`
        - darkest.schema: color.json
        - darkest.value: rgb(122, 161, 0)
        - darkest.uuid: 343f1685-2314-4a64-bc7a-5b7b3fd9fdcf
        - uuid: 9c1c3ad4-9168-444e-9fc1-2cb688155b57
    - `chartreuse-900`
        - darkest.schema: color.json
        - darkest.value: rgb(138, 180, 3)
        - darkest.uuid: 1637c50e-88e4-4273-8a75-6e8a233a690c
        - uuid: 746f8da2-ba48-4cf5-9ce1-4792b238b393
    - `chartreuse-1000`
        - darkest.schema: color.json
        - darkest.value: rgb(154, 198, 11)
        - darkest.uuid: 7dbedc59-e21c-4953-a7af-5e91d170604a
        - uuid: 36b8ba5f-7621-4ef9-baa1-8407f337396a
    - `chartreuse-1100`
        - darkest.schema: color.json
        - darkest.value: rgb(170, 216, 22)
        - darkest.uuid: 90417b40-97dd-47b3-9dbc-4ac45f8e4a5f
        - uuid: 3514e8ed-5240-45d1-a955-e14218b6995b
    - `chartreuse-1200`
        - darkest.schema: color.json
        - darkest.value: rgb(187, 232, 41)
        - darkest.uuid: e4b04d5d-e99d-41c5-8b24-540d653ef3ff
        - uuid: 9ce51df9-65eb-4418-bbf6-58b75c4d939a
    - `chartreuse-1300`
        - darkest.schema: color.json
        - darkest.value: rgb(205, 246, 72)
        - darkest.uuid: 615841b9-08b2-4e21-981a-b8f5247e9e89
        - uuid: 17a65a9b-e4dc-49e2-b3a5-6bbad0169848
    - `chartreuse-1400`
        - darkest.schema: color.json
        - darkest.value: rgb(225, 253, 132)
        - darkest.uuid: a75188c9-02e3-4337-8056-9a6f8f39001f
        - uuid: d57b9f68-344b-42f5-b72b-22c32b075392
    - `celery-100`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 47, 7)
        - darkest.uuid: 43feed9a-9a2a-44e0-9506-9bc5eb8eab1d
        - uuid: 9948ef23-8968-4a49-a6ce-14ead429cc41
    - `celery-200`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 61, 9)
        - darkest.uuid: 741a30fb-62a9-4c76-a78e-cc2590af9c7d
        - uuid: dc204ca4-8b04-4823-8da3-6c464af330b0
    - `celery-300`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 77, 12)
        - darkest.uuid: 5eda4487-8f82-48ed-8b22-aa38601bbf88
        - uuid: 4ef93614-2bac-41b8-ae98-95707697d2a1
    - `celery-400`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 95, 15)
        - darkest.uuid: 646d80c1-7073-4e13-bbfe-4bd0c2226079
        - uuid: 57d3d6ca-680a-41de-aee2-8e472ad9b820
    - `celery-500`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 113, 15)
        - darkest.uuid: 7d4c282b-78ce-4b2c-ab39-26bf02366e4d
        - uuid: 9a3b61b3-60a2-403e-abcc-6a8568bec8c9
    - `celery-600`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 132, 15)
        - darkest.uuid: 260d8921-3810-4a5d-a20f-cd00170cf951
        - uuid: 317b7550-de28-4657-8bf0-5dfe79cb6b2a
    - `celery-700`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 151, 20)
        - darkest.uuid: 7e7e6abb-a2e9-4308-ac8e-e6866ec17c64
        - uuid: ea9cc920-eda5-4b73-b386-296333ebb1f5
    - `celery-800`
        - darkest.schema: color.json
        - darkest.value: rgb(13, 171, 37)
        - darkest.uuid: 3b130e0d-eb9b-49e6-84db-eda6ee95eee5
        - uuid: 5344d9fb-3ad2-4bd5-a115-f4754f87f6c1
    - `celery-900`
        - darkest.schema: color.json
        - darkest.value: rgb(45, 191, 58)
        - darkest.uuid: 706f3a95-ab27-497f-aab7-f4ed806eef30
        - uuid: 2bbd48f8-0084-4e85-9bed-8f090f2d54da
    - `celery-1000`
        - darkest.schema: color.json
        - darkest.value: rgb(80, 208, 82)
        - darkest.uuid: 021a55b8-26ae-4767-82fb-06b20c58762b
        - uuid: 876e1d10-865d-4dc6-a012-7e9ea9e0c1ca
    - `celery-1100`
        - darkest.schema: color.json
        - darkest.value: rgb(115, 224, 107)
        - darkest.uuid: e091babe-6e02-4393-a67e-63222ab860b4
        - uuid: 35d35ac3-a1f2-4bfb-89f5-b6806b8b762d
    - `celery-1200`
        - darkest.schema: color.json
        - darkest.value: rgb(147, 237, 131)
        - darkest.uuid: 9913e84a-4070-476f-a570-a16781a924cf
        - uuid: 5fb14377-3a8e-49bc-bb73-781e11eed069
    - `celery-1300`
        - darkest.schema: color.json
        - darkest.value: rgb(180, 247, 162)
        - darkest.uuid: d2d8dc91-da75-4c56-a0d8-e6e9802434ad
        - uuid: 33b27950-19cd-48d9-94d4-1cd6b9b4586e
    - `celery-1400`
        - darkest.schema: color.json
        - darkest.value: rgb(213, 252, 202)
        - darkest.uuid: c5c3c68c-8293-4ebb-a8d1-9f4af902906e
        - uuid: 352ea9ac-2b7f-43f1-b040-a1801568a017
    - `green-100`
        - darkest.schema: color.json
        - darkest.value: rgb(10, 44, 28)
        - darkest.uuid: e5a14d4a-47c5-4a53-84c5-589a0749d906
        - uuid: 276a4066-5ca6-4ade-b4f1-b3e58acf4377
    - `green-200`
        - darkest.schema: color.json
        - darkest.value: rgb(7, 59, 36)
        - darkest.uuid: e8f294f5-cb17-4fdc-b370-ca2e3f95d342
        - uuid: 3b4b58b6-975d-4896-8828-f081825da89d
    - `green-300`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 76, 46)
        - darkest.uuid: cd5e0471-a8c0-46cd-b98c-be3a74c2b6d2
        - uuid: d4de36bd-c29c-456b-becd-1234351f271f
    - `green-400`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 93, 57)
        - darkest.uuid: c5e88879-9773-446c-883e-96531bcb8fad
        - uuid: 37ecd358-1206-4eef-a44e-e2b0dd01261c
    - `green-500`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 111, 69)
        - darkest.uuid: 27649ccc-69a8-48d6-9d52-6d6e2e28ae17
        - uuid: dce88e4e-12c0-4218-a72d-e1fbd219dd81
    - `green-600`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 130, 82)
        - darkest.uuid: a0513e49-8483-40f8-8b8f-41fdc222f13d
        - uuid: 7578a7e1-8514-4b09-9573-255832c15926
    - `green-700`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 149, 98)
        - darkest.uuid: 9c24175e-34a5-46c8-b646-f70c08292776
        - uuid: b41aedde-9bf1-4e7b-b8aa-606b820d41a9
    - `green-800`
        - darkest.schema: color.json
        - darkest.value: rgb(28, 168, 114)
        - darkest.uuid: 412da16e-4db2-47d8-84d4-583ae35534f9
        - uuid: 14f8e2f4-dad6-4b69-bdd4-d03e73003e04
    - `green-900`
        - darkest.schema: color.json
        - darkest.value: rgb(52, 187, 132)
        - darkest.uuid: 5afee2ee-a5d5-4dcf-a917-11dfdd0c3691
        - uuid: 8ef877cc-6735-4b0f-949e-39fc9712f73f
    - `green-1000`
        - darkest.schema: color.json
        - darkest.value: rgb(75, 205, 149)
        - darkest.uuid: 3d6732a1-a1f9-4e18-927b-93cebaae3895
        - uuid: 7697d674-3253-4da7-984a-18b9aa2a35db
    - `green-1100`
        - darkest.schema: color.json
        - darkest.value: rgb(103, 222, 168)
        - darkest.uuid: a2f8f6c6-07b4-43a4-8f59-995ea2bf4e82
        - uuid: 0c851763-8bc6-4c70-a0b4-d5515a6cadf1
    - `green-1200`
        - darkest.schema: color.json
        - darkest.value: rgb(137, 236, 188)
        - darkest.uuid: 07fa1b72-bf84-4fd5-9565-28373fae6a1f
        - uuid: 7d1049d6-3a01-4d8a-9405-d30c35fdc4f3
    - `green-1300`
        - darkest.schema: color.json
        - darkest.value: rgb(177, 244, 209)
        - darkest.uuid: c5ec27ed-3a16-44fe-bb8d-a21edd2f4d73
        - uuid: 9617a312-6be4-4777-a207-d9f74dbab583
    - `green-1400`
        - darkest.schema: color.json
        - darkest.value: rgb(214, 249, 228)
        - darkest.uuid: df5458e5-891b-4a88-a96c-748a812978a7
        - uuid: b915ddcd-cb87-4c7b-99ae-d090051de24c
    - `seafoam-100`
        - darkest.schema: color.json
        - darkest.value: rgb(18, 43, 42)
        - darkest.uuid: 080b56a3-6f95-422a-9f4b-d850966c4984
        - uuid: 0166e259-f257-4c4f-a122-3aee06ad6dce
    - `seafoam-200`
        - darkest.schema: color.json
        - darkest.value: rgb(19, 57, 55)
        - darkest.uuid: 2876bdd7-af97-4cd6-89cc-bdb9c2110946
        - uuid: c2caa7cc-f60c-4f7e-b71c-7e9f5d16b4f0
    - `seafoam-300`
        - darkest.schema: color.json
        - darkest.value: rgb(16, 73, 70)
        - darkest.uuid: d90b7496-0f54-41ce-96eb-c973457661ae
        - uuid: 79073fbb-6b19-413b-9a83-b268473aa401
    - `seafoam-400`
        - darkest.schema: color.json
        - darkest.value: rgb(3, 91, 88)
        - darkest.uuid: ec603c2c-b2b2-4769-a889-ba7c91a458eb
        - uuid: fdb0e2ef-ca1a-4800-985b-ce5e083f4f2f
    - `seafoam-500`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 108, 104)
        - darkest.uuid: c24b866c-5ac0-49de-857b-48c655fa9990
        - uuid: aa68b1a7-5b06-41ae-a372-01acc217469e
    - `seafoam-600`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 127, 121)
        - darkest.uuid: 73b58f7e-008b-44ae-8969-19d981d444d6
        - uuid: a249c284-3775-49ad-9596-7b497f5efc3f
    - `seafoam-700`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 146, 140)
        - darkest.uuid: 0b8528e6-ceea-47a5-9727-24e97d7bc138
        - uuid: 7725c5fd-db09-4b41-aba2-0cce5ea894b7
    - `seafoam-800`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 165, 159)
        - darkest.uuid: df8f47d4-5c3b-4ecb-b9fb-5d2dbd39d696
        - uuid: f07bd231-b065-4ec2-9021-593adf11b0b6
    - `seafoam-900`
        - darkest.schema: color.json
        - darkest.value: rgb(26, 185, 178)
        - darkest.uuid: dca23a18-2b19-48bf-9894-2f0948f6c05e
        - uuid: 4cc18837-1143-45f8-b5f8-bbe5c2255dae
    - `seafoam-1000`
        - darkest.schema: color.json
        - darkest.value: rgb(66, 202, 195)
        - darkest.uuid: c416b5c5-0506-419f-88ca-f722f12a9d86
        - uuid: 59e0a6f6-b508-4692-9b66-f95188a7e4cf
    - `seafoam-1100`
        - darkest.schema: color.json
        - darkest.value: rgb(102, 218, 211)
        - darkest.uuid: 4a853bfc-f1b0-4e39-8cd8-da0350c99cd5
        - uuid: effca489-bb2f-442e-b129-c8aea79f732d
    - `seafoam-1200`
        - darkest.schema: color.json
        - darkest.value: rgb(139, 232, 225)
        - darkest.uuid: 8e4c65b7-d819-4ffd-9398-71e9d294ba63
        - uuid: 0ab0f9f2-fc1c-441a-bf59-905afdfc2c6c
    - `seafoam-1300`
        - darkest.schema: color.json
        - darkest.value: rgb(179, 242, 237)
        - darkest.uuid: ef35ace8-870d-42e0-8ce6-2df61415431f
        - uuid: d1d66e58-dca2-459e-9b36-5b065baab4a1
    - `seafoam-1400`
        - darkest.schema: color.json
        - darkest.value: rgb(215, 248, 244)
        - darkest.uuid: 9499384b-336c-4a41-af05-645a92ae40d4
        - uuid: 7e74f5c0-aac3-4b7b-9d0d-aa32318fbc9b
    - `cyan-100`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 41, 68)
        - darkest.uuid: 24a8bb5a-93c3-4dd1-9ea2-d48c11479fe7
        - uuid: 769520e3-f099-4127-b0a7-053a5cd7f064
    - `cyan-200`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 54, 88)
        - darkest.uuid: 3445cf4b-2460-4692-acf2-71844d687da4
        - uuid: c60f9f06-af09-417d-bb93-8e468cfd0f28
    - `cyan-300`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 69, 108)
        - darkest.uuid: e4bcf4fc-aaec-49a5-a2bb-6bb55e7fff47
        - uuid: 2d6619da-85d7-40ff-92cf-0c8e2eb360a5
    - `cyan-400`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 86, 128)
        - darkest.uuid: 94a5bd53-d69a-4063-b630-1976230d4f2d
        - uuid: 2cd007c2-65d6-4738-bb25-121e696fd0e2
    - `cyan-500`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 103, 147)
        - darkest.uuid: 909baeef-fd2f-4550-89ea-fb7ac9ea2db5
        - uuid: 77084572-b45e-4442-9020-7eee983adc27
    - `cyan-600`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 121, 167)
        - darkest.uuid: d753ef33-bfc0-424b-a2ac-ea87ecbee590
        - uuid: 219d3909-cfb6-41c3-8289-4593bd7e2701
    - `cyan-700`
        - darkest.schema: color.json
        - darkest.value: rgb(0, 140, 186)
        - darkest.uuid: 3cb348d4-14a9-43da-84c4-068cf46c8c6f
        - uuid: 78f198c9-5ad5-449b-9d6e-0929be1adf9d
    - `cyan-800`
        - darkest.schema: color.json
        - darkest.value: rgb(4, 160, 205)
        - darkest.uuid: ee8673ca-c39c-437e-b3a5-416f4e8664d3
        - uuid: 70fa195e-aef5-403f-9805-7540a657c7b7
    - `cyan-900`
        - darkest.schema: color.json
        - darkest.value: rgb(23, 180, 221)
        - darkest.uuid: 9c183829-4858-4908-b1ac-d89f40f2e903
        - uuid: 14e16755-6644-4d61-a83c-610454602193
    - `cyan-1000`
        - darkest.schema: color.json
        - darkest.value: rgb(57, 199, 234)
        - darkest.uuid: 04f3d463-9118-43d5-973d-8bf94417912d
        - uuid: a7c38642-509e-4392-992d-b65445f9d096
    - `cyan-1100`
        - darkest.schema: color.json
        - darkest.value: rgb(96, 216, 243)
        - darkest.uuid: 62a7ebff-a49b-4e7a-981f-692a506b4146
        - uuid: 429c47d3-91bd-4f17-89c3-58fb0ee61fa4
    - `cyan-1200`
        - darkest.schema: color.json
        - darkest.value: rgb(134, 230, 250)
        - darkest.uuid: 36a2af99-eef4-476b-a3b8-58eade0931b7
        - uuid: cf78f2f1-5a0f-4181-9aac-8a0b05073707
    - `cyan-1300`
        - darkest.schema: color.json
        - darkest.value: rgb(170, 242, 255)
        - darkest.uuid: 5f3df12b-1330-4482-ad34-c623bd36253c
        - uuid: ee6ab17e-86d3-4300-b759-7396d7ca362b
    - `cyan-1400`
        - darkest.schema: color.json
        - darkest.value: rgb(206, 249, 255)
        - darkest.uuid: fe63b8a3-ebb9-45fe-99c2-e246b53e06a6
        - uuid: b78fe68e-fb93-4325-84a6-f54c8baa59ef
    - `indigo-100`
        - darkest.schema: color.json
        - darkest.value: rgb(26, 29, 97)
        - darkest.uuid: e60cb247-c265-4009-9f0a-bcbbbb801dd4
        - uuid: f0c3fe87-ae87-4be0-98f7-6dc7ee8733be
    - `indigo-200`
        - darkest.schema: color.json
        - darkest.value: rgb(35, 39, 125)
        - darkest.uuid: 56c709dd-b41e-478a-8098-21014e3f9ec8
        - uuid: 3cb5777a-5c5b-424d-ba5f-5bf7895f724e
    - `indigo-300`
        - darkest.schema: color.json
        - darkest.value: rgb(46, 50, 158)
        - darkest.uuid: 716f244e-67c5-4566-b824-ed7f2192b585
        - uuid: 48cf3d1e-40f4-4882-8c4f-f0d158b24a56
    - `indigo-400`
        - darkest.schema: color.json
        - darkest.value: rgb(58, 63, 189)
        - darkest.uuid: c256e06e-07bc-4dcd-9239-48841916c93b
        - uuid: 1d68b577-0fba-47a1-9ec6-6bb03d1c7f72
    - `indigo-500`
        - darkest.schema: color.json
        - darkest.value: rgb(73, 78, 216)
        - darkest.uuid: 1ea0564b-6e88-456e-a796-4620d57b8771
        - uuid: 030f7a1c-b3a3-48b8-8e36-c91ae0c2114a
    - `indigo-600`
        - darkest.schema: color.json
        - darkest.value: rgb(90, 96, 235)
        - darkest.uuid: df590853-ce16-4ddf-bbe9-a912695eae17
        - uuid: 7a3cfd26-9e21-4431-b012-389f3dc577ad
    - `indigo-700`
        - darkest.schema: color.json
        - darkest.value: rgb(110, 115, 246)
        - darkest.uuid: 0ea3a7e0-35c5-46ec-ae9d-500c5ee06a16
        - uuid: a507c184-5736-4c38-a067-d7e6f629ebfd
    - `indigo-800`
        - darkest.schema: color.json
        - darkest.value: rgb(132, 136, 253)
        - darkest.uuid: 97e84a30-1de4-4e84-8d59-e625f9ec9ab1
        - uuid: 9e4b6c3f-4288-4580-b398-56f39682c45b
    - `indigo-900`
        - darkest.schema: color.json
        - darkest.value: rgb(153, 157, 255)
        - darkest.uuid: 5cb7ff5e-ec53-4df8-b59d-a1419190a6cf
        - uuid: 15ccd190-830c-4b93-af17-488ae1b7708e
    - `indigo-1000`
        - darkest.schema: color.json
        - darkest.value: rgb(174, 177, 255)
        - darkest.uuid: 0bf6170c-50d7-4600-96fe-2d1af93f173a
        - uuid: 70e1eb55-2dda-4a84-8cd0-47f1b68ae0ab
    - `indigo-1100`
        - darkest.schema: color.json
        - darkest.value: rgb(194, 196, 255)
        - darkest.uuid: c85ea1d9-e28d-46c5-abd0-c053858770e0
        - uuid: f7e71981-4756-42c8-ba41-5a2af2db93f3
    - `indigo-1200`
        - darkest.schema: color.json
        - darkest.value: rgb(212, 213, 255)
        - darkest.uuid: 91f9622a-03b4-47b0-b380-5f6d64c13b5d
        - uuid: f17fd1a0-4fe0-4e4e-9331-9880c32cb8dc
    - `indigo-1300`
        - darkest.schema: color.json
        - darkest.value: rgb(227, 228, 255)
        - darkest.uuid: c0bfd081-7859-4ed5-aa4c-c1f547dab8f3
        - uuid: 783ddb63-4810-40ef-bf1e-ca7b62cef6cc
    - `indigo-1400`
        - darkest.schema: color.json
        - darkest.value: rgb(240, 240, 255)
        - darkest.uuid: 080f9ea4-1d87-4691-adb7-3875a7708555
        - uuid: 72913637-2902-458d-a279-4f38ac1d2926
    - `purple-100`
        - darkest.schema: color.json
        - darkest.value: rgb(50, 16, 104)
        - darkest.uuid: ffc5aa7a-c339-4583-a586-3e8b1329d16d
        - uuid: 7d2d2fd5-1e6a-4299-a86a-0a15cf985453
    - `purple-200`
        - darkest.schema: color.json
        - darkest.value: rgb(67, 13, 140)
        - darkest.uuid: 2d67627b-372c-46af-b015-6c95bd027664
        - uuid: cf5d51e1-b890-4f48-a05a-5c1aac83cd7f
    - `purple-300`
        - darkest.schema: color.json
        - darkest.value: rgb(86, 16, 173)
        - darkest.uuid: be628028-f41d-4ace-abf3-f7f38ecb2e01
        - uuid: 2283b357-6479-45c0-a26c-3e80c19e8053
    - `purple-400`
        - darkest.schema: color.json
        - darkest.value: rgb(106, 29, 200)
        - darkest.uuid: 474fed30-921a-4795-8999-2310521c64c5
        - uuid: d55a6634-3973-4451-96de-7cdf9ec74d8b
    - `purple-500`
        - darkest.schema: color.json
        - darkest.value: rgb(126, 49, 222)
        - darkest.uuid: b912e8ba-ed77-4179-9b80-7448f9e37193
        - uuid: 8d9cfcad-2381-4fe8-9bc6-8efd30297410
    - `purple-600`
        - darkest.schema: color.json
        - darkest.value: rgb(145, 70, 236)
        - darkest.uuid: 05638159-aaf7-4f3e-849e-a46e80cd9ee6
        - uuid: 8a59e341-bb35-4a54-9b35-364f498364c7
    - `purple-700`
        - darkest.schema: color.json
        - darkest.value: rgb(162, 94, 246)
        - darkest.uuid: fb186f5e-72a8-4a27-8ba2-d2fdf53d5a5c
        - uuid: bcbb83ab-93d4-4112-91e5-f3ce82120016
    - `purple-800`
        - darkest.schema: color.json
        - darkest.value: rgb(178, 119, 250)
        - darkest.uuid: 30aae683-83e3-47a1-bdcb-ebe658e110a3
        - uuid: dc780ef5-84b9-4fb9-bb34-532d2ce49bdf
    - `purple-900`
        - darkest.schema: color.json
        - darkest.value: rgb(192, 143, 252)
        - darkest.uuid: 12d86845-fd54-4d30-aac8-bb9451560ba5
        - uuid: 4dc5cd47-bedf-4597-8f07-d0baf59a7484
    - `purple-1000`
        - darkest.schema: color.json
        - darkest.value: rgb(206, 166, 253)
        - darkest.uuid: e527a3bd-3543-4b40-8a9c-eb465695bdb9
        - uuid: e36883ef-a17f-4fdb-aa27-bb37a13533f6
    - `purple-1100`
        - darkest.schema: color.json
        - darkest.value: rgb(219, 188, 254)
        - darkest.uuid: 18265c0a-e466-4575-a364-3dfda9e71bd4
        - uuid: 0f787b0a-7d58-45f0-991b-ba135ccd6d28
    - `purple-1200`
        - darkest.schema: color.json
        - darkest.value: rgb(230, 207, 255)
        - darkest.uuid: ae071768-dcdd-4e30-8f72-d066abac97af
        - uuid: f204d5e8-4a3e-4c87-b874-0ac57b486424
    - `purple-1300`
        - darkest.schema: color.json
        - darkest.value: rgb(240, 224, 255)
        - darkest.uuid: fbaaff02-da93-4f45-830a-5fc449a58f0b
        - uuid: a864777a-b7c9-4d2f-82d4-5cc6782efc6b
    - `purple-1400`
        - darkest.schema: color.json
        - darkest.value: rgb(248, 237, 255)
        - darkest.uuid: 9ae063c9-5817-45b4-9f57-4b2196c845b9
        - uuid: df523779-ea77-4ef9-bf11-573d9ea021c6
    - `fuchsia-100`
        - darkest.schema: color.json
        - darkest.value: rgb(70, 14, 68)
        - darkest.uuid: 3a434405-c4b0-40ef-b383-7cb9a9b60cab
        - uuid: 8eb8a9eb-5e08-4c2a-937f-0f17ece1da8d
    - `fuchsia-200`
        - darkest.schema: color.json
        - darkest.value: rgb(93, 9, 92)
        - darkest.uuid: 779ec441-475d-41de-b207-3e139c7c3168
        - uuid: c4d01ae4-8b14-45ed-ab72-5211cf18a07a
    - `fuchsia-300`
        - darkest.schema: color.json
        - darkest.value: rgb(120, 0, 120)
        - darkest.uuid: 5fa7110f-0c33-4139-8277-eff40921939e
        - uuid: 1e502d0b-6d88-4f73-a493-2911621cf2c8
    - `fuchsia-400`
        - darkest.schema: color.json
        - darkest.value: rgb(146, 0, 147)
        - darkest.uuid: a81bfdd6-4b80-4f1a-922d-2f6e04c27e01
        - uuid: 6ef05285-e6da-4c5e-9ca4-0c9cbccb0090
    - `fuchsia-500`
        - darkest.schema: color.json
        - darkest.value: rgb(169, 19, 170)
        - darkest.uuid: 7ecdb8fa-7c4b-4392-bca8-a00a9b931cb4
        - uuid: 92ca51c5-b4a9-4ac4-a384-4158a425041a
    - `fuchsia-600`
        - darkest.schema: color.json
        - darkest.value: rgb(191, 43, 191)
        - darkest.uuid: 0fb76488-9965-4cf9-878f-ceed7fc2be43
        - uuid: 13cac94c-eebe-4504-b034-fc79d4d6ce68
    - `fuchsia-700`
        - darkest.schema: color.json
        - darkest.value: rgb(211, 65, 213)
        - darkest.uuid: 5f971453-aa30-4c1f-8cbc-be45ff042fcd
        - uuid: fbc24eea-0ccb-4fa3-bb78-09d5b8988c67
    - `fuchsia-800`
        - darkest.schema: color.json
        - darkest.value: rgb(228, 91, 229)
        - darkest.uuid: 5848fed6-5b42-42ef-9800-8f32e42cf6ba
        - uuid: 30a9972a-13f9-45eb-811a-e8819e16733f
    - `fuchsia-900`
        - darkest.schema: color.json
        - darkest.value: rgb(239, 120, 238)
        - darkest.uuid: 3c6d42c9-4cba-4373-a61c-c8617c509f92
        - uuid: e6d9c311-509d-4fe4-b225-afb752044df6
    - `fuchsia-1000`
        - darkest.schema: color.json
        - darkest.value: rgb(246, 149, 243)
        - darkest.uuid: a13d5f15-e4cc-4f7c-928f-aaccbf0d590e
        - uuid: c39fca6a-7e8e-4c39-a5fd-38b1c6dad0bd
    - `fuchsia-1100`
        - darkest.schema: color.json
        - darkest.value: rgb(251, 175, 246)
        - darkest.uuid: 0a4eb3af-d067-4d9f-af91-66c676e49e26
        - uuid: 6db3f51e-bacc-4ab8-9be5-4858f74884c7
    - `fuchsia-1200`
        - darkest.schema: color.json
        - darkest.value: rgb(254, 199, 248)
        - darkest.uuid: 0d93ff9f-63e8-4caf-9e7b-714e56d968d4
        - uuid: e9b1dc85-6d6e-4b1f-8d9b-2e35198a6b8f
    - `fuchsia-1300`
        - darkest.schema: color.json
        - darkest.value: rgb(255, 220, 250)
        - darkest.uuid: abd44b32-b837-4e11-95c7-4ba1c34db44b
        - uuid: e6bed7fe-2b70-43d1-bd81-3d06bf45256c
    - `fuchsia-1400`
        - darkest.schema: color.json
        - darkest.value: rgb(255, 235, 252)
        - darkest.uuid: 7c819391-d74c-4326-ae0d-fe3534eb44e3
        - uuid: 200a6384-7f09-4b2f-b5ac-a106c8cd6fd1
    - `magenta-100`
        - darkest.schema: color.json
        - darkest.value: rgb(83, 3, 41)
        - darkest.uuid: 9149371a-1978-4136-a89c-8895edd35e7d
        - uuid: ce26417e-9bb8-411e-a026-464293b06add
    - `magenta-200`
        - darkest.schema: color.json
        - darkest.value: rgb(106, 0, 52)
        - darkest.uuid: f5ffc5b3-d3e6-4d7e-b8a8-850324b5d9b8
        - uuid: 874c0257-997e-47fc-8034-aab4e96f97fe
    - `magenta-300`
        - darkest.schema: color.json
        - darkest.value: rgb(133, 0, 65)
        - darkest.uuid: 673ab9b4-e296-4472-b0b5-15adf9f1f762
        - uuid: f694bd14-d565-4ec2-baff-304500e438b3
    - `magenta-400`
        - darkest.schema: color.json
        - darkest.value: rgb(161, 0, 78)
        - darkest.uuid: 60560de2-28e6-44b4-bcff-f357fe13a4a7
        - uuid: 43d8a547-4a3b-4bf4-afa6-a22e99811644
    - `magenta-500`
        - darkest.schema: color.json
        - darkest.value: rgb(186, 22, 93)
        - darkest.uuid: 830123a6-0e42-4c4f-9b20-2f4204d37af8
        - uuid: 9d63598b-15dc-42d8-81f0-84bb906bfbdb
    - `magenta-600`
        - darkest.schema: color.json
        - darkest.value: rgb(209, 43, 114)
        - darkest.uuid: e6b14a1d-e26e-41c4-b386-7fb3f95b8c93
        - uuid: 5bddfcd1-4c98-45b7-a2b3-ad63bb55eaec
    - `magenta-700`
        - darkest.schema: color.json
        - darkest.value: rgb(227, 69, 137)
        - darkest.uuid: 11055a6b-7e81-4b59-9feb-8b0b6352be07
        - uuid: b5538c34-e3ef-4f42-a8e7-a0382bf74d16
    - `magenta-800`
        - darkest.schema: color.json
        - darkest.value: rgb(241, 97, 156)
        - darkest.uuid: 6676db79-7b7e-4fcf-868b-321f9372517a
        - uuid: 2da326e7-e8c4-4a4c-98bf-f8bd903c434a
    - `magenta-900`
        - darkest.schema: color.json
        - darkest.value: rgb(252, 124, 173)
        - darkest.uuid: fa5e523e-7ee3-46d0-971f-4ee95c7222b8
        - uuid: 2b5073f4-450b-4c86-8c12-a52b75a4ff00
    - `magenta-1000`
        - darkest.schema: color.json
        - darkest.value: rgb(255, 152, 191)
        - darkest.uuid: bdabbfb5-1ae6-44a7-bc2e-55e11f4e5154
        - uuid: c93e3507-c6b1-4560-a7cb-5d5113b5392c
    - `magenta-1100`
        - darkest.schema: color.json
        - darkest.value: rgb(255, 179, 207)
        - darkest.uuid: 548a74eb-4401-44f4-85b4-921287d84ac9
        - uuid: 1f891345-4822-4977-8dee-b2161f1289ef
    - `magenta-1200`
        - darkest.schema: color.json
        - darkest.value: rgb(255, 202, 221)
        - darkest.uuid: 9c634688-1ad5-438b-bd44-a92c64ef9934
        - uuid: cbde36d9-8429-4904-9148-a3ede646d148
    - `magenta-1300`
        - darkest.schema: color.json
        - darkest.value: rgb(255, 221, 233)
        - darkest.uuid: 6c441ca7-0294-462f-ac18-7b28ff20d7ff
        - uuid: 2a7b30ec-db12-4ba6-8316-c134705a5867
    - `magenta-1400`
        - darkest.schema: color.json
        - darkest.value: rgb(255, 236, 243)
        - darkest.uuid: 15f36ded-01af-4c5d-8b11-45523e7d908e
        - uuid: 336a0cef-c962-4847-9eba-2d6e9571c790
    - `opacity-checkerboard-square-dark`
        - darkest.schema: alias.json
        - darkest.value: gray-800
        - darkest.uuid: f783b8cb-d31f-46c2-b550-990639752510
        - uuid: 0b807f40-d63e-4482-8d53-18fadc9663d5
    - `overlay-opacity`
        - darkest.schema: opacity.json
        - darkest.value: 0.6
        - darkest.uuid: 31d5b502-6266-4309-8f8a-3892e6e158da
        - uuid: bc377afe-9055-45f9-8906-9f83ee07dada
    - `drop-shadow-color`
        - light.schema: color.json
        - light.value: rgba(0, 0, 0, 0.15)
        - light.uuid: be45ace6-9227-41d1-80be-0c58c3f8b3cb
        - dark.schema: color.json
        - dark.value: rgba(0, 0, 0, 0.5)
        - dark.uuid: 4633ae77-5101-4c62-8253-6406df2613f1
        - darkest.schema: color.json
        - darkest.value: rgba(0, 0, 0, 0.8)
        - darkest.uuid: e54491a8-d3ca-4d67-bacb-74ac192a387f
        - wireframe.schema: color.json
        - wireframe.value: rgba(0, 0, 0, 0.15)
        - wireframe.uuid: 1deef94a-efba-4670-a1be-78ee021bdfe8
    - `background-base-color`
        - light.schema: alias.json
        - light.value: gray-200
        - light.uuid: e0d8739d-18dd-44bc-92ea-e443882a780b
        - dark.schema: alias.json
        - dark.value: gray-50
        - dark.uuid: 46060531-9372-41a7-8db3-d3c100338e6d
        - darkest.schema: alias.json
        - darkest.value: gray-50
        - darkest.uuid: cf1299aa-86c7-4523-b6ae-6de597ac3712
        - wireframe.schema: alias.json
        - wireframe.value: gray-200
        - wireframe.uuid: 6945b976-83b4-4aec-a687-cb461bc9fe70
    - `background-layer-1-color`
        - light.schema: alias.json
        - light.value: gray-100
        - light.uuid: 7e6678b7-2903-434b-8ee2-06c83815b01d
        - dark.schema: alias.json
        - dark.value: gray-75
        - dark.uuid: fc1758f3-22bd-4dc0-9ef3-91fa0f454036
        - darkest.schema: alias.json
        - darkest.value: gray-75
        - darkest.uuid: da228344-5b83-4e08-96d2-089068138ba0
        - wireframe.schema: alias.json
        - wireframe.value: gray-100
        - wireframe.uuid: 3ccfa493-5375-492a-93b0-7418655c3b56
    - `background-layer-2-color`
        - darkest.schema: alias.json
        - darkest.value: gray-100
        - darkest.uuid: e30b7936-6ae7-4ada-8892-94a1f67d55c9
        - uuid: 9abdcab8-2ff4-40b2-8d86-5e0a09b8cf88
    - `neutral-background-color-default`
        - light.schema: alias.json
        - light.value: gray-800
        - light.uuid: 5d54b2d5-b0c6-4438-b141-80ca91a0b8a4
        - dark.schema: alias.json
        - dark.value: gray-400
        - dark.uuid: 4f58764f-deb1-4863-89ce-663868fe73e6
        - darkest.schema: alias.json
        - darkest.value: gray-400
        - darkest.uuid: a1c5a204-e937-4ce1-a5be-580f6b0df7a5
        - wireframe.schema: alias.json
        - wireframe.value: gray-800
        - wireframe.uuid: 9ff12440-fe4e-4f47-ab43-aea39f9ce6f2
    - `neutral-background-color-hover`
        - light.schema: alias.json
        - light.value: gray-900
        - light.uuid: e0379e06-e2d3-4d6f-ba81-6cdf4012a022
        - dark.schema: alias.json
        - dark.value: gray-300
        - dark.uuid: 7ea82825-f138-44e5-9c75-29c444086d6a
        - darkest.schema: alias.json
        - darkest.value: gray-300
        - darkest.uuid: 0ce569ea-d735-42a3-96c2-60201fcb616f
        - wireframe.schema: alias.json
        - wireframe.value: gray-900
        - wireframe.uuid: b6c12c43-39da-415b-a828-43883dfa212d
    - `neutral-background-color-down`
        - light.schema: alias.json
        - light.value: gray-900
        - light.uuid: 5577ffde-5708-4ea7-a50d-d938f07eba7f
        - dark.schema: alias.json
        - dark.value: gray-200
        - dark.uuid: 20e71891-57dc-4dc7-9f30-330d3753e8dd
        - darkest.schema: alias.json
        - darkest.value: gray-200
        - darkest.uuid: 4901987b-b70c-42ef-92fd-b8c5b6894bfc
        - wireframe.schema: alias.json
        - wireframe.value: gray-900
        - wireframe.uuid: 69c94cbb-b852-4b5c-8e5f-26664dbf083a
    - `neutral-background-color-key-focus`
        - light.schema: alias.json
        - light.value: gray-900
        - light.uuid: b8ba6d4d-737e-4c18-a901-bb35fdc173c3
        - dark.schema: alias.json
        - dark.value: gray-300
        - dark.uuid: 78a08d31-921c-4b47-a50c-4f283e916712
        - darkest.schema: alias.json
        - darkest.value: gray-300
        - darkest.uuid: f90c1f60-5d23-41ed-ab42-30eeb9d079ba
        - wireframe.schema: alias.json
        - wireframe.value: gray-900
        - wireframe.uuid: 83e3eea6-e59e-4aca-8126-a9e984e90b08
    - `neutral-background-color-selected-default`
        - spectrum.schema: alias.json
        - spectrum.value: gray-700
        - spectrum.uuid: fd1c9f2b-8358-4bd3-a5cc-d211673428bc
        - express.schema: alias.json
        - express.value: gray-800
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: 60caae29-d389-421e-a574-b26bcaeed3bf
    - `neutral-background-color-selected-hover`
        - spectrum.schema: alias.json
        - spectrum.value: gray-800
        - spectrum.uuid: 1c220122-5f32-42f9-848f-ae10061241e5
        - express.schema: alias.json
        - express.value: gray-900
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: 0deac090-f00a-4927-880d-dfdca06bd66e
    - `neutral-background-color-selected-down`
        - spectrum.schema: alias.json
        - spectrum.value: gray-900
        - spectrum.uuid: 966c56d0-4461-45e7-9e20-0277f2111a34
        - express.schema: alias.json
        - express.value: gray-900
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: bf3de5f6-665c-4a6a-b238-e767b7240fd8
    - `neutral-background-color-selected-key-focus`
        - spectrum.schema: alias.json
        - spectrum.value: gray-800
        - spectrum.uuid: 9b8df7df-3439-4614-b446-97a4de782e27
        - express.schema: alias.json
        - express.value: gray-900
        - express.deprecated: true
        - express.deprecated_comment: Express will merge with Spectrum with the release of Spectrum 2.
        - express.uuid: e012e155-2220-43e9-a248-61c71e99cc2b
    - `neutral-subdued-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: gray-400
        - darkest.uuid: bc9979cb-e7c6-45b2-be4d-0ba3c817e2ef
        - uuid: 46f2e88e-6238-43d9-8632-b8e3e5a4a52d
    - `neutral-subdued-background-color-hover`
        - darkest.schema: alias.json
        - darkest.value: gray-300
        - darkest.uuid: 2d72c9fc-22d0-4e4d-9b00-fae4b30a47b5
        - uuid: 12111698-b0d6-49a6-a652-c9f31c67aa61
    - `neutral-subdued-background-color-down`
        - darkest.schema: alias.json
        - darkest.value: gray-200
        - darkest.uuid: 11bf9149-d8df-4f37-ba21-51ff911b0517
        - uuid: 8d0018a9-9d83-426c-a757-2923b67db391
    - `neutral-subdued-background-color-key-focus`
        - darkest.schema: alias.json
        - darkest.value: gray-300
        - darkest.uuid: a1e08db6-3a72-4b8e-9475-b54a7b9be506
        - uuid: f26e8e36-183c-4364-94e6-4158b461825b
    - `accent-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: accent-color-600
        - darkest.uuid: f24eb871-6419-4cef-88a2-cca8548ae31e
        - uuid: 1b8286ae-82d5-41e6-a15b-84f2f325094d
    - `accent-background-color-hover`
        - darkest.schema: alias.json
        - darkest.value: accent-color-500
        - darkest.uuid: 9e140a94-c11f-470b-b7af-49880e58d4ce
        - uuid: ca7fdae0-9e35-4c28-8ff2-fb92be1c3155
    - `accent-background-color-down`
        - darkest.schema: alias.json
        - darkest.value: accent-color-400
        - darkest.uuid: e2c0de7e-d271-4b2c-9393-d864a95732e6
        - uuid: d6c0d9cb-0778-45a2-9c70-8c7e234556df
    - `accent-background-color-key-focus`
        - darkest.schema: alias.json
        - darkest.value: accent-color-500
        - darkest.uuid: af809118-7a97-409c-925f-8d7636a791c8
        - uuid: 0a1e74f1-ffc9-4f6a-bed6-f75882e072e7
    - `informative-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: informative-color-600
        - darkest.uuid: da3a7c08-7f54-4486-bb66-146db21f0627
        - uuid: f95deae9-0726-4fb5-be41-0680d40439ec
    - `informative-background-color-hover`
        - darkest.schema: alias.json
        - darkest.value: informative-color-500
        - darkest.uuid: 092415a8-0054-4f6d-9a93-1541c767b2c5
        - uuid: 8c7a907e-7572-46c1-8a72-42552293510b
    - `informative-background-color-down`
        - darkest.schema: alias.json
        - darkest.value: informative-color-400
        - darkest.uuid: c9c09cc9-1ebd-4738-9613-6a0a67bea4f9
        - uuid: 73ad4073-7d38-4e74-947b-7e9d6140663b
    - `informative-background-color-key-focus`
        - darkest.schema: alias.json
        - darkest.value: informative-color-500
        - darkest.uuid: e5292c94-ea4a-49ba-8c25-6ab1114e0fe3
        - uuid: a6b570d5-3e91-4dff-b706-bf485a137d03
    - `negative-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: negative-color-600
        - darkest.uuid: 1117b73b-42e3-4ad6-8b26-af76859a27bb
        - uuid: dc84d6f1-c287-405a-bb35-352b030d3718
    - `negative-background-color-hover`
        - darkest.schema: alias.json
        - darkest.value: negative-color-500
        - darkest.uuid: 648da867-549e-47c3-9312-e9cfda288705
        - uuid: 81b0e851-9a50-4960-ac8c-e29a04ff7b0d
    - `negative-background-color-down`
        - darkest.schema: alias.json
        - darkest.value: negative-color-400
        - darkest.uuid: 8565ec8e-2196-47ac-8636-40084acbfd4f
        - uuid: a88541e5-37e6-4865-a24e-cc319c1c7b62
    - `negative-background-color-key-focus`
        - darkest.schema: alias.json
        - darkest.value: negative-color-500
        - darkest.uuid: f1470931-f4f8-47d9-b118-5b813e4c154a
        - uuid: 4cefc283-c2f0-4199-9fab-40426911023b
    - `positive-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: positive-color-600
        - darkest.uuid: 82b54f71-7c9e-4388-9e3b-4d13f12fad60
        - uuid: f237a708-8e19-41bc-a1b5-ce25b68f474f
    - `positive-background-color-hover`
        - darkest.schema: alias.json
        - darkest.value: positive-color-500
        - darkest.uuid: 2992a78b-9ce0-4b29-a4f6-ddbc51f820f2
        - uuid: 0e986617-aa45-47dc-8b11-139089ea89ac
    - `positive-background-color-down`
        - darkest.schema: alias.json
        - darkest.value: positive-color-400
        - darkest.uuid: 58a934d2-a715-4544-aa79-7f94bd493f09
        - uuid: 1922ea54-19d8-44d6-97e5-9ab66c0782db
    - `positive-background-color-key-focus`
        - darkest.schema: alias.json
        - darkest.value: positive-color-500
        - darkest.uuid: 56d371b4-437f-4ca9-854f-ae6daf5dcfce
        - uuid: 0983a44e-7aa9-4b1b-9d1f-4932d0c4a961
    - `notice-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: notice-color-800
        - darkest.uuid: 0a0bb434-e005-41ec-bee5-709a2e41928b
        - uuid: 95bfb862-41e4-40f1-817b-3a236898bb48
    - `gray-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: gray-700
        - darkest.uuid: fa68c3bf-88b5-4653-a42d-7de5ce7cec3d
        - uuid: f76e86c1-02ef-447f-97d2-8dbaf0d1b03c
    - `red-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: red-700
        - darkest.uuid: ce074ee2-a2a2-4da3-a99e-603524193d46
        - uuid: fd5b572e-a0e2-48a6-99f8-ed098507e8d6
    - `orange-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: orange-800
        - darkest.uuid: 3e9a6c2a-bd09-4d28-a95c-920109c1852f
        - uuid: bbcdb9c1-0c50-4f6d-8da1-37e166860f22
    - `yellow-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: yellow-1000
        - darkest.uuid: 61c5e375-bff3-479f-8c32-2d2a5edb906c
        - uuid: b3abccc3-58c1-41b3-b9e2-c21e5610be67
    - `chartreuse-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: chartreuse-900
        - darkest.uuid: 5df9a029-dc91-4078-a198-574486948834
        - uuid: f78ade0c-eeb6-496f-b99d-657072f27485
    - `celery-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: celery-800
        - darkest.uuid: a9ab7a59-9cab-47fb-876d-6f0af93dc5df
        - uuid: 2c159320-bf17-48b6-9d09-b2d037f937d1
    - `green-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: green-700
        - darkest.uuid: 49170573-9c22-42e1-a1ce-cd3d3972ddb7
        - uuid: 2fc00105-857e-4eb5-a414-2cc6b4cd22ff
    - `seafoam-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: seafoam-700
        - darkest.uuid: 9a727140-328d-430f-9b10-8965eebe77d1
        - uuid: 29502bad-fdad-4a78-b60f-f515a62bac43
    - `cyan-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: cyan-700
        - darkest.uuid: 543af64f-9c28-4e88-8597-3259cd7ebf1f
        - uuid: d228688c-fee3-460c-b2f0-6abce661db3d
    - `blue-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: blue-700
        - darkest.uuid: 83591a94-83e1-4557-8f50-cc1fe9793b76
        - uuid: 7944588f-bff1-4669-8f8b-0ad3c028dce0
    - `indigo-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: indigo-700
        - darkest.uuid: b7f5a677-4e89-40e1-8324-7619a628ce8b
        - uuid: 358aa988-9b99-4c33-8f5f-1198510ca5df
    - `purple-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: purple-700
        - darkest.uuid: e577d521-0271-4226-a094-624b35a05826
        - uuid: a65c1b35-c3f0-4ec9-8931-5168a526fe97
    - `fuchsia-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: fuchsia-700
        - darkest.uuid: 7b4d71d3-ad78-4e02-a48e-fa79f40854a2
        - uuid: 862d0909-d391-49b2-96f0-1c85f0048fc4
    - `magenta-background-color-default`
        - darkest.schema: alias.json
        - darkest.value: magenta-700
        - darkest.uuid: 5867d764-d909-4490-b947-533e89997d0a
        - uuid: c92d3443-05b2-4290-a74e-c601ab758e9b
    - `neutral-visual-color`
        - darkest.schema: alias.json
        - darkest.value: gray-600
        - darkest.uuid: 35ef6675-7e66-4ef5-8c8d-e8e70939b224
        - uuid: 8c258b68-face-42d2-8115-4a20b1ff281f
    - `accent-visual-color`
        - darkest.schema: alias.json
        - darkest.value: accent-color-900
        - darkest.uuid: 8ccd197f-fc8e-4d31-866c-2b96049eea89
        - uuid: e9907cf2-5c99-4155-82a5-33e6657a5ba4
    - `informative-visual-color`
        - darkest.schema: alias.json
        - darkest.value: informative-color-900
        - darkest.uuid: fd64c9ca-6ad7-415c-b0b8-2579399e33a5
        - uuid: a915f4f5-af40-46c6-a35a-0efb9d8aac53
    - `negative-visual-color`
        - darkest.schema: alias.json
        - darkest.value: negative-color-700
        - darkest.uuid: 70cb0316-5b7a-416c-bf93-7d8885c4fce6
        - uuid: a1097979-35e2-43b0-99de-2cbe53ea00db
    - `notice-visual-color`
        - darkest.schema: alias.json
        - darkest.value: notice-color-900
        - darkest.uuid: 2759c912-6385-40e4-9ed9-ff2e11815b4d
        - uuid: fe7cfa0e-c782-410f-a355-c1526222d9e4
    - `positive-visual-color`
        - darkest.schema: alias.json
        - darkest.value: positive-color-800
        - darkest.uuid: 25e8289f-6c82-4485-8920-a187f790cd47
        - uuid: 0e1d30df-1779-4b28-ad93-64827e982d00
    - `gray-visual-color`
        - darkest.schema: alias.json
        - darkest.value: gray-600
        - darkest.uuid: 0f7a39c2-3ee7-4ff0-873f-334c81054b77
        - uuid: 6854095c-ac3e-49b4-8753-5fc2eb7abb80
    - `red-visual-color`
        - darkest.schema: alias.json
        - darkest.value: red-700
        - darkest.uuid: 870f90ab-7f3e-41b6-9c11-59e9c4ff82c6
        - uuid: 6c0a6428-ed2d-4f53-b986-fbc8c4d14e88
    - `orange-visual-color`
        - darkest.schema: alias.json
        - darkest.value: orange-900
        - darkest.uuid: e7bf9977-2edf-48bc-8099-ad95e57b55b1
        - uuid: dd5b5b66-e8a5-4c5b-9159-903d975345c2
    - `yellow-visual-color`
        - darkest.schema: alias.json
        - darkest.value: yellow-1100
        - darkest.uuid: 4a2ebbb5-b8b7-43a0-9d64-4974bb382a8b
        - uuid: 411ea3a1-6d41-474b-81c5-8356eb2dbfe3
    - `chartreuse-visual-color`
        - darkest.schema: alias.json
        - darkest.value: chartreuse-900
        - darkest.uuid: a46d8e05-4f56-4b46-a279-0164abfa42e8
        - uuid: 30d087e8-d588-4bc6-96e3-59bf8e9565c1
    - `celery-visual-color`
        - darkest.schema: alias.json
        - darkest.value: celery-800
        - darkest.uuid: 37c1311b-29ed-44ab-b656-a7538726ad77
        - uuid: a98a7116-e19c-4c8a-8c63-535f3fc3c2ee
    - `green-visual-color`
        - darkest.schema: alias.json
        - darkest.value: green-800
        - darkest.uuid: 1219770d-543d-4216-9e87-c158f8a74df6
        - uuid: 790fa82a-ac72-4f0c-8238-3da2738dce44
    - `seafoam-visual-color`
        - darkest.schema: alias.json
        - darkest.value: seafoam-800
        - darkest.uuid: 736e4768-7944-40ec-a412-4cd36299e03d
        - uuid: df95350c-00ab-47a3-a5b4-5685122cf31e
    - `cyan-visual-color`
        - darkest.schema: alias.json
        - darkest.value: cyan-900
        - darkest.uuid: 091a2073-baa0-4cc6-b943-9dddc285ad62
        - uuid: 8353f6f2-10ba-46c0-b348-e80148a0ba13
    - `blue-visual-color`
        - darkest.schema: alias.json
        - darkest.value: blue-900
        - darkest.uuid: 63fe16ed-70fa-4eaf-918c-f642ff69ce05
        - uuid: acc6aee5-ce5c-4b44-b8b5-10b118420ed8
    - `indigo-visual-color`
        - darkest.schema: alias.json
        - darkest.value: indigo-900
        - darkest.uuid: 584ccbd4-3243-4041-b665-e2342d2b26e8
        - uuid: 89d267a2-a0ea-42e6-9cad-60eff42560e2
    - `purple-visual-color`
        - darkest.schema: alias.json
        - darkest.value: purple-900
        - darkest.uuid: 0ee2957b-c401-4106-8ff3-9de9fa544a03
        - uuid: 291aad5e-5dea-4318-98bd-16ed32ce4065
    - `fuchsia-visual-color`
        - darkest.schema: alias.json
        - darkest.value: fuchsia-900
        - darkest.uuid: 38e60263-cb08-4090-a653-5acbd1664ae0
        - uuid: 5df99248-f4ae-48cc-9f7f-5ea6da6f8942
    - `magenta-visual-color`
        - darkest.schema: alias.json
        - darkest.value: magenta-900
        - darkest.uuid: 178e4bc6-6986-4e77-aab0-78dbe66f8e6f
        - uuid: 787dba09-d1c2-4e52-985a-568a91234610

    </details>
    <details><summary>Updated Properties (668)</summary>

    - `font-size-1200`
        - desktop.value: 50px -> 51px
    - `font-size-1300`
        - desktop.value: 60px -> 58px
    - `heading-sans-serif-font-weight`
        - schema: system-set.json -> alias.json
        - uuid: 2094ec97-c8de-46d7-93a4-1f49988bfbf2 -> 1d4d09b4-021a-48e8-a724-bfecc13df325
    - `heading-serif-font-weight`
        - schema: system-set.json -> alias.json
        - uuid: 2e852baa-60a2-4e7e-9e30-99c14d7e4fef -> 350aa193-9996-49c8-b5e4-54d4f7bef3c2
    - `heading-cjk-font-weight`
        - schema: system-set.json -> alias.json
        - uuid: 203b2652-aa62-47f7-b4b5-52e22532de80 -> bd54516c-2fda-4421-ab62-720c3a887a34
    - `heading-sans-serif-emphasized-font-weight`
        - schema: system-set.json -> alias.json
        - uuid: 445edecf-360c-4c42-aaf2-3b7380678365 -> e4a183fd-53c5-4dbb-afd1-6308e2e74f80
    - `heading-serif-emphasized-font-weight`
        - schema: system-set.json -> alias.json
        - uuid: aa539366-543c-4cf5-b326-8c6e8a09f846 -> a0983216-b0c5-4a3f-97dc-96ee711acb1f
    - `heading-size-s`
        - value: font-size-300 -> font-size-400
    - `heading-size-xs`
        - value: font-size-200 -> font-size-300
    - `heading-cjk-size-s`
        - value: font-size-200 -> font-size-300
    - `heading-cjk-size-xs`
        - value: font-size-100 -> font-size-200
    - `heading-cjk-size-xxs`
        - value: font-size-75 -> font-size-100
    - `detail-sans-serif-font-weight`
        - value: bold-font-weight -> medium-font-weight
    - `detail-serif-font-weight`
        - value: bold-font-weight -> medium-font-weight
    - `detail-cjk-font-weight`
        - value: extra-bold-font-weight -> bold-font-weight
    - `detail-sans-serif-emphasized-font-weight`
        - value: bold-font-weight -> regular-font-weight
    - `detail-serif-emphasized-font-weight`
        - value: bold-font-weight -> medium-font-weight
    - `detail-size-xl`
        - value: font-size-200 -> font-size-300
    - `detail-size-l`
        - value: font-size-100 -> font-size-200
    - `detail-size-m`
        - value: font-size-75 -> font-size-100
    - `detail-size-s`
        - value: font-size-50 -> font-size-75
    - `detail-color`
        - value: gray-900 -> gray-600
    - `detail-cjk-size-s`
        - value: font-size-25 -> font-size-50
        - uuid: 648162b2-154f-459c-a261-8226bf855714 -> 8eb0f29f-71a1-4aa5-a3ed-98a373baf620
    - `detail-cjk-size-m`
        - value: font-size-50 -> font-size-75
        - uuid: 16915081-2765-4553-9e8c-7acb686938cc -> 236c73fb-d3bc-4390-8682-dd06fbd92d23
    - `detail-cjk-size-l`
        - value: font-size-75 -> font-size-100
        - uuid: e9c9bf5a-b7a1-4a53-8335-66697c5bd44f -> 92399d83-aa71-4207-b533-4fe69e6271e2
    - `detail-cjk-size-xl`
        - value: font-size-100 -> font-size-200
        - uuid: 1bbf01a7-c624-452f-a6b6-8486724bc362 -> 533265d4-7304-4688-b2fb-379a086b20bf
    - `code-cjk-strong-font-weight`
        - value: black-font-weight -> bold-font-weight
    - `code-cjk-strong-emphasized-font-weight`
        - value: black-font-weight -> bold-font-weight
    - `accent-color-100`
        - schema: system-set.json -> alias.json
        - uuid: 0dd9c008-b20f-4a51-be59-67d9530877ff -> 2e080bb5-6f2c-4fd9-96a2-bf9fc19d2649
    - `accent-color-200`
        - schema: system-set.json -> alias.json
        - uuid: d4850a3d-cce3-4cd5-ba44-27281cad5934 -> cf583998-4dfd-4222-a554-8e05ed7fb5d6
    - `accent-color-300`
        - schema: system-set.json -> alias.json
        - uuid: 89c05b32-63f5-46ed-abe1-a36247bd9797 -> ea67f054-1f42-427e-a768-beb8d21de2a3
    - `accent-color-400`
        - schema: system-set.json -> alias.json
        - uuid: 794b3679-1bcf-4c64-a55b-99be3f7676e5 -> a249e4b1-e6f9-4ef3-96c6-1559059839a7
    - `accent-color-500`
        - schema: system-set.json -> alias.json
        - uuid: 6eee723c-d9dd-4b14-ab44-75779c44f59e -> c1c0e6fb-ce21-49d7-91bb-73ce873aa69f
    - `accent-color-600`
        - schema: system-set.json -> alias.json
        - uuid: 11e391f6-66f0-4ed0-b70a-3f3d3a0e2f90 -> 5a2000be-5640-4389-a128-b2c164ad2253
    - `accent-color-700`
        - schema: system-set.json -> alias.json
        - uuid: fc2868a8-1b1b-4da7-a51f-7faa6e7f7d4d -> a8fbe39b-db6d-4bb4-a7c5-8a235060d2ae
    - `accent-color-800`
        - schema: system-set.json -> alias.json
        - uuid: 85bd13e9-ff5a-419d-bc33-97fd44cf1789 -> 87a2c8f0-54fd-4939-8f42-3124fde1e49e
    - `accent-color-900`
        - schema: system-set.json -> alias.json
        - uuid: 23cb9c14-f3cf-430b-9d0c-4749160542d8 -> 90d82778-1cbb-47c0-aab9-b6e38a9cdc54
    - `accent-color-1000`
        - schema: system-set.json -> alias.json
        - uuid: 203cf947-661e-4e96-8d13-5f0d3e9237bf -> 9bf3fa2f-75d3-44d3-ae30-d88893665366
    - `accent-color-1100`
        - schema: system-set.json -> alias.json
        - uuid: 80493b68-bdd4-4478-8ec1-2049922382be -> f7f853a5-f091-4a7e-8aea-68d060c840f0
    - `accent-color-1200`
        - schema: system-set.json -> alias.json
        - uuid: eeed3404-3bde-4bb6-975f-556ec92297bd -> 7c141cdb-1e5e-468a-ba48-0df01b275402
    - `accent-color-1300`
        - schema: system-set.json -> alias.json
        - uuid: 0083814f-7761-4a52-97e3-ca154d7b8603 -> f7307eba-e311-41a8-bb50-0b1e96833dfa
    - `accent-color-1400`
        - schema: system-set.json -> alias.json
        - uuid: 1124ea0a-6ba1-4b7e-852e-db760d182a97 -> 06585cf4-a924-49b2-b6c8-f0e80b57c576
    - `corner-radius-75`
        - schema: system-set.json -> dimension.json
        - uuid: bc4c5fdb-7456-4178-8c3b-4aaaa65805a6 -> ecb9d03a-7340-4b43-8aa7-f89eef9f3a20
    - `corner-radius-100`
        - schema: system-set.json -> dimension.json
        - uuid: 6063a01d-8ba8-40ab-9c5e-a2112db74fee -> bf24d15e-ad86-4b6a-a9e0-e8fd49a5ae30
    - `corner-radius-200`
        - schema: system-set.json -> dimension.json
        - uuid: c8beb921-82c4-48ee-be9e-aab8b4b41a35 -> 52ad01be-f512-4fa3-ae67-8c6cef70810c
    - `drop-shadow-x`
        - schema: system-set.json -> alias.json
        - uuid: 55d07ba8-ccf3-4374-97c4-3ad927edbdd2 -> 81415747-aa3f-4ef3-b0bc-7c33f07a4316
    - `drop-shadow-y`
        - schema: system-set.json -> alias.json
        - uuid: 859114f3-d2a6-4b2e-80c5-118e44ce9cf6 -> c530129f-248c-4e36-ba7f-05d6d6a53962
    - `drop-shadow-blur`
        - schema: system-set.json -> alias.json
        - uuid: 056dbbc1-ea92-4d56-9928-b14311af8726 -> ac20a6da-31a7-4c8b-b361-0ad820cd8429
    - `workflow-icon-size-50`
        - mobile.value: 18px -> 16px
    - `workflow-icon-size-75`
        - mobile.value: 20px -> 18px
    - `workflow-icon-size-100`
        - desktop.value: 18px -> 20px
        - mobile.value: 22px -> 24px
    - `workflow-icon-size-200`
        - desktop.value: 20px -> 22px
        - mobile.value: 24px -> 28px
    - `workflow-icon-size-300`
        - desktop.value: 22px -> 26px
        - mobile.value: 28px -> 30px
    - `text-to-visual-50`
        - desktop.value: 6px -> 5px
        - mobile.value: 8px -> 7px
    - `text-to-visual-75`
        - desktop.value: 7px -> 5px
        - mobile.value: 9px -> 7px
    - `text-to-visual-100`
        - desktop.value: 8px -> 6px
        - mobile.value: 10px -> 8px
    - `text-to-visual-200`
        - desktop.value: 9px -> 7px
        - mobile.value: 11px -> 9px
    - `text-to-visual-300`
        - desktop.value: 10px -> 8px
        - mobile.value: 13px -> 10px
    - `border-width-100`
        - schema: system-set.json -> dimension.json
        - uuid: e5837232-9892-47ec-b8cc-91920283697a -> b5525080-28e7-4eb7-aee9-fb2c71a16f68
    - `component-pill-edge-to-visual-only-75`
        - mobile.value: 5px -> 6px
    - `component-pill-edge-to-visual-only-100`
        - desktop.value: 7px -> 6px
        - mobile.value: 9px -> 8px
    - `component-pill-edge-to-visual-only-200`
        - desktop.value: 10px -> 9px
        - mobile.value: 13px -> 11px
    - `component-pill-edge-to-visual-only-300`
        - desktop.value: 13px -> 11px
        - mobile.value: 16px -> 15px
    - `component-edge-to-visual-only-50`
        - mobile.value: 4px -> 5px
    - `component-edge-to-visual-only-75`
        - mobile.value: 5px -> 6px
    - `component-edge-to-visual-only-100`
        - desktop.value: 7px -> 6px
        - mobile.value: 9px -> 8px
    - `component-edge-to-visual-only-200`
        - desktop.value: 10px -> 9px
        - mobile.value: 13px -> 11px
    - `component-edge-to-visual-only-300`
        - desktop.value: 13px -> 11px
        - mobile.value: 16px -> 15px
    - `component-top-to-workflow-icon-50`
        - mobile.value: 4px -> 5px
    - `component-top-to-workflow-icon-75`
        - mobile.value: 5px -> 6px
    - `component-top-to-workflow-icon-100`
        - desktop.value: 7px -> 6px
        - mobile.value: 9px -> 8px
    - `component-top-to-workflow-icon-200`
        - desktop.value: 10px -> 9px
        - mobile.value: 13px -> 11px
    - `component-top-to-workflow-icon-300`
        - desktop.value: 13px -> 11px
        - mobile.value: 16px -> 15px
    - `field-top-to-progress-circle-small`
        - mobile.value: 7px -> 6px
    - `field-top-to-progress-circle-medium`
        - desktop.value: 8px -> 6px
        - mobile.value: 12px -> 8px
    - `field-top-to-progress-circle-large`
        - desktop.value: 12px -> 9px
        - mobile.value: 17px -> 11px
    - `field-top-to-progress-circle-extra-large`
        - desktop.value: 16px -> 11px
        - mobile.value: 22px -> 15px
    - `field-width`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 192px -> field-width-small
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 240px -> field-width-small
    - `side-label-character-count-top-margin-small`
        - schema: scale-set.json -> dimension.json
        - uuid: ac75b149-e9f3-45df-aaa6-6a28ebf22458 -> a86ae363-b6b4-4da0-9630-97336922b3a1
    - `side-label-character-count-top-margin-medium`
        - schema: scale-set.json -> dimension.json
        - uuid: 8a6d587a-8d04-4f53-b86f-3f8cd17cfa3a -> 4d93210f-f01a-4d1c-8c10-2cb4b9d14626
    - `side-label-character-count-top-margin-large`
        - schema: scale-set.json -> dimension.json
        - uuid: 53f6909b-3f50-4962-932a-16db7acec5b1 -> e2d9e241-469a-4b03-bd6a-a105a8ed5e00
    - `side-label-character-count-top-margin-extra-large`
        - schema: scale-set.json -> dimension.json
        - uuid: c0972a55-7db7-4425-bd86-9e14688843a0 -> 9b1f15bf-ea4f-4f82-8c4f-3770b7f47353
    - `checkbox-control-size-small`
        - schema: system-set.json -> scale-set.json
    - `checkbox-control-size-medium`
        - schema: system-set.json -> scale-set.json
    - `checkbox-control-size-large`
        - schema: system-set.json -> scale-set.json
    - `checkbox-control-size-extra-large`
        - schema: system-set.json -> scale-set.json
    - `checkbox-top-to-control-small`
        - schema: system-set.json -> scale-set.json
    - `checkbox-top-to-control-medium`
        - schema: system-set.json -> scale-set.json
    - `checkbox-top-to-control-large`
        - schema: system-set.json -> scale-set.json
    - `checkbox-top-to-control-extra-large`
        - schema: system-set.json -> scale-set.json
    - `switch-control-width-small`
        - schema: system-set.json -> scale-set.json
    - `switch-control-width-medium`
        - schema: system-set.json -> scale-set.json
    - `switch-control-width-large`
        - schema: system-set.json -> scale-set.json
    - `switch-control-width-extra-large`
        - schema: system-set.json -> scale-set.json
    - `switch-control-height-small`
        - schema: system-set.json -> scale-set.json
    - `switch-control-height-medium`
        - schema: system-set.json -> scale-set.json
    - `switch-control-height-large`
        - schema: system-set.json -> scale-set.json
    - `switch-control-height-extra-large`
        - schema: system-set.json -> scale-set.json
    - `switch-top-to-control-small`
        - schema: system-set.json -> scale-set.json
    - `switch-top-to-control-medium`
        - schema: system-set.json -> scale-set.json
    - `switch-top-to-control-large`
        - schema: system-set.json -> scale-set.json
    - `switch-top-to-control-extra-large`
        - schema: system-set.json -> scale-set.json
    - `radio-button-control-size-small`
        - schema: system-set.json -> scale-set.json
    - `radio-button-control-size-medium`
        - schema: system-set.json -> scale-set.json
    - `radio-button-control-size-large`
        - schema: system-set.json -> scale-set.json
    - `radio-button-control-size-extra-large`
        - schema: system-set.json -> scale-set.json
    - `radio-button-top-to-control-small`
        - schema: system-set.json -> scale-set.json
    - `radio-button-top-to-control-medium`
        - schema: system-set.json -> scale-set.json
    - `radio-button-top-to-control-large`
        - schema: system-set.json -> scale-set.json
    - `radio-button-top-to-control-extra-large`
        - schema: system-set.json -> scale-set.json
    - `field-label-top-to-asterisk-extra-large`
        - desktop.value: 19px -> 18px
    - `field-label-top-margin-medium`
        - schema: scale-set.json -> dimension.json
        - uuid: 2e307771-487d-494a-97bb-ada56c157c60 -> b5243f56-7985-4686-b41f-9b9b9a18b047
    - `field-label-top-margin-large`
        - schema: scale-set.json -> dimension.json
        - uuid: 11679297-ddb6-43b6-870c-66bccaf9efb1 -> f7dd90d8-91e6-4090-a5a9-6b30087860a4
    - `field-label-top-margin-extra-large`
        - schema: scale-set.json -> dimension.json
        - uuid: 0d2b575a-2d70-40b1-b3c0-562a64529e81 -> 5c14d528-fe17-4b0b-a123-edbdb93fd173
    - `help-text-top-to-workflow-icon-small`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 4px -> component-top-to-workflow-icon-75
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 5px -> component-top-to-workflow-icon-75
    - `help-text-top-to-workflow-icon-medium`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 3px -> component-top-to-workflow-icon-100
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 4px -> component-top-to-workflow-icon-100
    - `help-text-top-to-workflow-icon-large`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 6px -> component-top-to-workflow-icon-200
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 8px -> component-top-to-workflow-icon-200
    - `help-text-top-to-workflow-icon-extra-large`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 9px -> component-top-to-workflow-icon-300
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 11px -> component-top-to-workflow-icon-300
    - `status-light-dot-size-small`
        - schema: dimension.json -> scale-set.json
    - `status-light-dot-size-medium`
        - desktop.value: 8px -> 10px
        - mobile.value: 10px -> 12px
    - `status-light-dot-size-large`
        - desktop.value: 10px -> 12px
        - mobile.value: 12px -> 14px
    - `status-light-dot-size-extra-large`
        - desktop.value: 10px -> 14px
        - mobile.value: 12px -> 16px
    - `status-light-top-to-dot-small`
        - mobile.value: 11px -> 10px
    - `status-light-top-to-dot-medium`
        - desktop.value: 12px -> 11px
        - mobile.value: 15px -> 14px
    - `status-light-top-to-dot-large`
        - desktop.value: 15px -> 14px
        - mobile.value: 19px -> 18px
    - `status-light-top-to-dot-extra-large`
        - desktop.value: 19px -> 17px
        - mobile.value: 24px -> 22px
    - `tooltip-tip-width`
        - desktop.value: 8px -> 10px
        - mobile.value: 10px -> 12px
    - `tooltip-tip-height`
        - desktop.value: 4px -> 5px
        - mobile.value: 5px -> 6px
    - `toast-height`
        - desktop.value: 48px -> 52px
        - mobile.value: 56px -> 60px
    - `toast-top-to-workflow-icon`
        - desktop.value: 15px -> 18px
        - mobile.value: 17px -> 20px
    - `toast-top-to-text`
        - desktop.value: 14px -> 18px
        - mobile.value: 16px -> 20px
    - `toast-bottom-to-text`
        - desktop.value: 17px -> 20px
        - mobile.value: 19px -> 22px
    - `action-bar-height`
        - schema: scale-set.json -> alias.json
        - uuid: 62695212-bc5e-4c3a-93c9-f4e112ef5117 -> e67822de-d0cd-4b49-8e90-6c43523bb4dd
    - `action-bar-top-to-item-counter`
        - schema: scale-set.json -> alias.json
        - uuid: ec663da9-b374-477d-9222-cce2682bfaa5 -> 73f82d09-7927-461c-b7d7-ab0bc6b3e3f9
    - `meter-thickness-large`
        - desktop.value: 6px -> 8px
        - mobile.value: 8px -> 10px
    - `popover-top-to-content-area`
        - schema: scale-set.json -> alias.json
        - uuid: 8b388882-bd89-46cb-882b-f3198e4af710 -> f97488e8-b1c1-442e-b98c-0ae6cff0b774
    - `menu-item-label-to-description`
        - schema: dimension.json -> alias.json
        - value: 1px -> menu-item-label-to-description-medium
    - `menu-item-section-divider-height`
        - value: 8px -> 12px
    - `slider-track-thickness`
        - schema: system-set.json -> dimension.json
        - uuid: 538acb74-223d-4090-8be8-7a7e62a8c765 -> 50a71b8b-30fb-40c0-b81e-5ce0dcc8c96b
    - `slider-control-height-small`
        - schema: system-set.json -> scale-set.json
    - `slider-control-height-medium`
        - schema: system-set.json -> scale-set.json
    - `slider-control-height-large`
        - schema: system-set.json -> scale-set.json
    - `slider-control-height-extra-large`
        - schema: system-set.json -> scale-set.json
    - `slider-handle-size-small`
        - schema: system-set.json -> scale-set.json
    - `slider-handle-size-medium`
        - schema: system-set.json -> scale-set.json
    - `slider-handle-size-large`
        - schema: system-set.json -> scale-set.json
    - `slider-handle-size-extra-large`
        - schema: system-set.json -> scale-set.json
    - `slider-handle-border-width-down-small`
        - schema: system-set.json -> scale-set.json
    - `slider-handle-border-width-down-medium`
        - schema: system-set.json -> scale-set.json
    - `slider-handle-border-width-down-large`
        - schema: system-set.json -> scale-set.json
    - `slider-handle-border-width-down-extra-large`
        - schema: system-set.json -> scale-set.json
    - `slider-handle-gap`
        - schema: system-set.json -> dimension.json
        - uuid: 5b61baab-5888-4690-9577-5829bc92a839 -> 1a257268-32e9-4c5c-8477-32a724ff1d42
    - `slider-bottom-to-handle-small`
        - schema: system-set.json -> scale-set.json
    - `slider-bottom-to-handle-medium`
        - schema: system-set.json -> scale-set.json
    - `slider-bottom-to-handle-large`
        - schema: system-set.json -> scale-set.json
    - `slider-bottom-to-handle-extra-large`
        - schema: system-set.json -> scale-set.json
    - `slider-control-to-field-label-small`
        - desktop.value: 5px -> -4px
        - mobile.value: 6px -> -8px
    - `slider-control-to-field-label-medium`
        - desktop.value: 8px -> -12px
        - mobile.value: 10px -> -16px
    - `slider-control-to-field-label-large`
        - desktop.value: 11px -> -16px
        - mobile.value: 14px -> -20px
    - `slider-control-to-field-label-extra-large`
        - desktop.value: 14px -> -20px
        - mobile.value: 17px -> -28px
    - `picker-border-width`
        - schema: system-set.json -> alias.json
        - uuid: 3eff4ac7-9246-42c7-a49a-b7fe961b13d1 -> 69c28762-f456-4641-b6ce-7cb295e3a27d
    - `combo-box-visual-to-field-button-small`
        - schema: scale-set.json -> alias.json
        - uuid: 3c0b4b94-a765-4dd3-a2df-c72e9d1baa62 -> 5d054a3e-e4bb-4ca3-b84a-51b3d7fa2cb8
    - `combo-box-visual-to-field-button-medium`
        - schema: scale-set.json -> alias.json
        - uuid: 693dfa94-4a7a-47b3-b623-71471826b09b -> c5a4baf2-effe-4d9a-92f3-b4ead5440d36
    - `combo-box-visual-to-field-button-large`
        - schema: scale-set.json -> alias.json
        - uuid: 557ad551-fb5f-4b66-a40c-a1abf2fcb34d -> 356c4912-69c7-4a95-956b-c1aa78cb02cb
    - `combo-box-visual-to-field-button-extra-large`
        - schema: scale-set.json -> alias.json
        - uuid: c75b058d-ee9f-462e-b03c-64c6f75e85ab -> 4a4ee415-1f25-4d36-928c-5ece0ce4abcc
    - `combo-box-visual-to-field-button-quiet`
        - schema: dimension.json -> alias.json
        - value: 0px -> combo-box-visual-to-field-button
    - `thumbnail-size-75`
        - desktop.value: 18px -> 20px
        - mobile.value: 22px -> 24px
    - `thumbnail-size-100`
        - desktop.value: 20px -> 24px
        - mobile.value: 26px -> 28px
    - `thumbnail-size-200`
        - desktop.value: 22px -> 28px
        - mobile.value: 28px -> 32px
    - `thumbnail-size-300`
        - desktop.value: 26px -> 32px
        - mobile.value: 32px -> 36px
    - `thumbnail-size-400`
        - desktop.value: 28px -> 36px
        - mobile.value: 36px -> 40px
    - `thumbnail-size-500`
        - desktop.value: 32px -> 40px
        - mobile.value: 40px -> 44px
    - `thumbnail-size-600`
        - desktop.value: 36px -> 44px
        - mobile.value: 46px -> 48px
    - `thumbnail-size-700`
        - desktop.value: 40px -> 48px
        - mobile.value: 50px -> 52px
    - `thumbnail-size-800`
        - desktop.value: 44px -> 52px
        - mobile.value: 55px -> 56px
    - `thumbnail-size-900`
        - desktop.value: 50px -> 56px
        - mobile.value: 62px -> 64px
    - `thumbnail-size-1000`
        - desktop.value: 56px -> 64px
        - mobile.value: 70px -> 72px
    - `alert-dialog-title-size`
        - schema: scale-set.json -> alias.json
        - uuid: b1341b98-d28d-480d-aa8b-78a7c849ea88 -> 9b7ce1fc-ea8a-4d7b-a926-0accbd6b1197
    - `alert-dialog-description-size`
        - schema: scale-set.json -> alias.json
        - uuid: aa9edd54-4fb1-457f-b933-c8317314ceee -> 9dc42d1a-b87d-4a5d-a5a3-6afd4d5bd599
    - `opacity-checkerboard-square-size`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 8px -> opacity-checkerboard-square-size-medium
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 10px -> opacity-checkerboard-square-size-medium
    - `contextual-help-title-size`
        - schema: scale-set.json -> alias.json
        - uuid: 4735b809-1359-482f-8af1-cd21ea34454a -> 5358fd6c-d9a0-4caa-a85e-af82ed82efaf
    - `contextual-help-body-size`
        - schema: scale-set.json -> alias.json
        - uuid: 54ce0fa1-c891-4bdc-9e20-52b97993dbbc -> e458fa68-ab9c-4441-a7d5-a02f42df1cae
    - `breadcrumbs-height`
        - value: component-height-300 -> component-height-200
    - `breadcrumbs-height-compact`
        - value: component-height-200 -> component-height-100
    - `breadcrumbs-height-multiline`
        - mobile.value: 84px -> 90px
    - `breadcrumbs-top-to-text`
        - schema: scale-set.json -> alias.json
        - uuid: 1a279535-7113-462a-86fe-d2bdd058b48f -> d084038e-bc31-43be-99ee-13cf727eaf9d
    - `breadcrumbs-top-to-text-compact`
        - schema: scale-set.json -> alias.json
        - uuid: b5f8e8af-620d-4cfe-87ec-d6d21f776461 -> b19547e2-bd8f-435d-b726-4f2ce6a83984
    - `breadcrumbs-top-to-text-multiline`
        - desktop.value: 12px -> 4px
        - mobile.value: 15px -> 5px
    - `breadcrumbs-bottom-to-text`
        - schema: scale-set.json -> alias.json
        - uuid: 9377b9d1-922c-40c9-8018-4cc528b6e778 -> f0e6a20d-8c2d-4aa3-9060-b6ca66aa7943
    - `breadcrumbs-bottom-to-text-compact`
        - schema: scale-set.json -> alias.json
        - uuid: 47b9651f-69a7-46af-ae94-196f62a61d1b -> 70a356be-c304-4bb4-a9df-97806931f089
    - `breadcrumbs-bottom-to-text-multiline`
        - mobile.value: 10px -> 11px
    - `breadcrumbs-start-edge-to-text`
        - schema: scale-set.json -> alias.json
        - uuid: 844de981-645a-4f24-bab6-6561b762f3c8 -> a0542dab-98fb-45d8-b4a0-79cfd2cc4f1c
    - `breadcrumbs-top-to-separator-icon`
        - schema: scale-set.json -> alias.json
        - uuid: dd645f4d-18c9-41e9-bdd7-7a63cd40728f -> 15e56281-5fc1-4b59-b815-fc333231e364
    - `breadcrumbs-top-to-separator-icon-compact`
        - schema: scale-set.json -> alias.json
        - uuid: 6df1c933-7265-4a4f-bcff-93f0e12871f7 -> a63e8df1-124f-4f3e-9e1b-ba422b8d8257
    - `breadcrumbs-top-to-separator-icon-multiline`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 15px -> breadcrumbs-top-to-separator-multiline
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 20px -> breadcrumbs-separator-icon-to-bottom-text-multiline
    - `breadcrumbs-separator-icon-to-bottom-text-multiline`
        - schema: scale-set.json -> alias.json
        - uuid: 442d74d2-69d2-47bd-b474-5e63c8844122 -> 56dd2fd0-c7a3-4f2c-bda9-8e6ba6d99e6c
    - `breadcrumbs-truncated-menu-to-separator-icon`
        - schema: dimension.json -> alias.json
        - value: 0px -> breadcrumbs-truncated-menu-to-separator
    - `breadcrumbs-top-to-truncated-menu`
        - schema: scale-set.json -> dimension.json
        - uuid: c39a7d2e-ded0-481a-8b9f-78aa4e1e0e76 -> 751734bd-1c58-4222-bbd8-8b2349f2fbd2
    - `breadcrumbs-top-to-truncated-menu-compact`
        - schema: scale-set.json -> alias.json
        - uuid: 6f36fa37-f5f5-49fe-9b06-e69e51a1fb46 -> e0aba287-799f-4621-97cb-563352002a20
    - `breadcrumbs-truncated-menu-to-bottom-text`
        - schema: dimension.json -> scale-set.json
    - `avatar-size-75`
        - desktop.value: 18px -> 20px
        - mobile.value: 22px -> 24px
    - `avatar-size-100`
        - desktop.value: 20px -> 24px
        - mobile.value: 26px -> 28px
    - `avatar-size-200`
        - desktop.value: 22px -> 28px
        - mobile.value: 28px -> 32px
    - `avatar-size-300`
        - desktop.value: 26px -> 32px
        - mobile.value: 32px -> 36px
    - `avatar-size-400`
        - desktop.value: 28px -> 36px
        - mobile.value: 36px -> 40px
    - `avatar-size-500`
        - desktop.value: 32px -> 40px
        - mobile.value: 40px -> 44px
    - `avatar-size-600`
        - desktop.value: 36px -> 44px
        - mobile.value: 46px -> 48px
    - `avatar-size-700`
        - desktop.value: 40px -> 48px
        - mobile.value: 50px -> 52px
    - `alert-banner-minimum-height`
        - desktop.value: 48px -> 56px
    - `alert-banner-top-to-workflow-icon`
        - desktop.value: 15px -> 18px
        - mobile.value: 21px -> 20px
    - `alert-banner-top-to-text`
        - desktop.value: 14px -> 18px
    - `alert-banner-bottom-to-text`
        - desktop.value: 17px -> 20px
    - `color-area-border-rounding`
        - value: corner-radius-100 -> corner-radius-medium-size-small
    - `color-slider-border-rounding`
        - schema: dimension.json -> alias.json
        - value: 4px -> corner-radius-medium-size-small
    - `illustrated-message-maximum-width`
        - schema: dimension.json -> alias.json
        - value: 380px -> illustrated-message-vertical-maximum-width
    - `illustrated-message-title-size`
        - schema: scale-set.json -> alias.json
        - uuid: ef4d00df-ab62-4206-b101-728419d8eb8f -> 365ec548-431b-4e1e-9f9d-7b04d337f001
    - `illustrated-message-cjk-title-size`
        - schema: scale-set.json -> alias.json
        - uuid: d241cc79-d102-4732-afe2-fec515ba1d18 -> e77279df-bc62-441a-8a30-5faa41d0df10
    - `illustrated-message-body-size`
        - schema: scale-set.json -> alias.json
        - uuid: fed462be-2f98-4dcf-9822-53f7321a305d -> 4140710f-ae31-4ae3-b8b6-2d3eb6a1ae78
    - `search-field-minimum-width-multiplier`
        - value: 3 -> 4
    - `card-minimum-width`
        - component: cards -> card
    - `card-preview-minimum-height`
        - component: cards -> card
    - `card-selection-background-size`
        - component: cards -> card
    - `drop-zone-border-dash-gap`
        - value: 4px -> 6px
    - `drop-zone-title-size`
        - value: illustrated-message-title-size -> drop-zone-title-font-size
    - `drop-zone-cjk-title-size`
        - value: illustrated-message-cjk-title-size -> drop-zone-cjk-title-font-size
    - `drop-zone-body-size`
        - value: illustrated-message-body-size -> drop-zone-body-font-size
    - `coach-mark-title-size`
        - schema: scale-set.json -> alias.json
        - uuid: fe336e37-83d3-4ede-ac92-1e8d2b015415 -> 331604db-3f28-472e-810d-9010ed2c8e33
    - `coach-mark-body-size`
        - schema: scale-set.json -> alias.json
        - uuid: c7ea57c3-9715-4347-aa19-efdbdd35b7e0 -> eba9f466-deda-48d5-a120-14419d5a670f
    - `coach-mark-pagination-body-size`
        - schema: scale-set.json -> alias.json
        - uuid: 5a9623c0-37f0-4363-87ed-b015e9f73455 -> df8bc8ae-b6fa-4414-93b7-c89d8097fe11
    - `table-column-header-row-top-to-text-medium`
        - desktop.value: 7px -> 6px
    - `table-row-height-small-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 32px -> table-row-height-small
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 40px -> table-row-height-small
    - `table-row-height-medium-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 40px -> table-row-height-medium
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 50px -> table-row-height-medium
    - `table-row-height-large-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 48px -> table-row-height-large
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 60px -> table-row-height-large
    - `table-row-height-extra-large-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 56px -> table-row-height-extra-large
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 70px -> table-row-height-extra-large
    - `table-row-top-to-text-small-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 8px -> table-row-top-to-text-small
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 10px -> table-row-top-to-text-small
    - `table-row-top-to-text-medium-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 11px -> table-row-top-to-text-medium
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 14px -> table-row-top-to-text-medium
    - `table-row-top-to-text-large-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 14px -> table-row-top-to-text-large
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 18px -> table-row-top-to-text-large
    - `table-row-top-to-text-extra-large-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 17px -> table-row-top-to-text-extra-large
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 21px -> table-row-top-to-text-extra-large
    - `table-row-bottom-to-text-small-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 9px -> table-row-bottom-to-text-small
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 11px -> table-row-bottom-to-text-small
    - `table-row-bottom-to-text-medium-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 12px -> table-row-bottom-to-text-medium
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 15px -> table-row-bottom-to-text-medium
    - `table-row-bottom-to-text-large-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 14px -> table-row-bottom-to-text-large
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 18px -> table-row-bottom-to-text-large
    - `table-row-bottom-to-text-extra-large-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 17px -> table-row-bottom-to-text-extra-large
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 22px -> table-row-bottom-to-text-extra-large
    - `table-row-top-to-text-medium-spacious`
        - mobile.value: 18px -> 16px
    - `table-header-row-checkbox-to-top-medium`
        - desktop.value: 9px -> 8px
        - mobile.value: 13px -> 11px
    - `table-row-checkbox-to-top-small-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 10px -> table-row-checkbox-to-top-small
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 14px -> table-row-checkbox-to-top-small
    - `table-row-checkbox-to-top-medium-compact`
        - desktop.value: 9px -> 8px
        - mobile.value: 13px -> 11px
    - `table-row-checkbox-to-top-medium-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 13px -> table-row-checkbox-to-top-medium
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 18px -> table-row-checkbox-to-top-medium
    - `table-row-checkbox-to-top-medium-spacious`
        - desktop.value: 17px -> 16px
        - mobile.value: 23px -> 21px
    - `table-row-checkbox-to-top-large-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 16px -> table-row-checkbox-to-top-large
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 22px -> table-row-checkbox-to-top-large
    - `table-row-checkbox-to-top-extra-large-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 19px -> table-row-checkbox-to-top-extra-large
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 26px -> table-row-checkbox-to-top-extra-large
    - `table-thumbnail-to-top-minimum-small-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 5px -> table-thumbnail-to-top-minimum-small
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 6px -> table-thumbnail-to-top-minimum-small
    - `table-thumbnail-to-top-minimum-medium-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 7px -> table-thumbnail-to-top-minimum-medium
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 9px -> table-thumbnail-to-top-minimum-medium
    - `table-thumbnail-to-top-minimum-large-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 8px -> table-thumbnail-to-top-minimum-large
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 10px -> table-thumbnail-to-top-minimum-large
    - `table-thumbnail-to-top-minimum-extra-large-regular`
        - desktop.schema: dimension.json -> alias.json
        - desktop.value: 8px -> table-thumbnail-to-top-minimum-extra-large
        - mobile.schema: dimension.json -> alias.json
        - mobile.value: 10px -> table-thumbnail-to-top-minimum-extra-large
    - `tab-item-height-small`
        - component: tabs -> tab-item
    - `tab-item-height-medium`
        - component: tabs -> tab-item
    - `tab-item-height-large`
        - component: tabs -> tab-item
    - `tab-item-height-extra-large`
        - component: tabs -> tab-item
    - `tab-item-compact-height-small`
        - component: tabs -> tab-item
    - `tab-item-compact-height-medium`
        - component: tabs -> tab-item
    - `tab-item-compact-height-large`
        - component: tabs -> tab-item
    - `tab-item-compact-height-extra-large`
        - component: tabs -> tab-item
    - `tab-item-to-tab-item-horizontal-small`
        - component: tabs -> tab-item
    - `tab-item-to-tab-item-horizontal-medium`
        - component: tabs -> tab-item
    - `tab-item-to-tab-item-horizontal-large`
        - component: tabs -> tab-item
    - `tab-item-to-tab-item-horizontal-extra-large`
        - component: tabs -> tab-item
    - `tab-item-to-tab-item-vertical-small`
        - component: tabs -> tab-item
    - `tab-item-to-tab-item-vertical-medium`
        - component: tabs -> tab-item
    - `tab-item-to-tab-item-vertical-large`
        - component: tabs -> tab-item
    - `tab-item-to-tab-item-vertical-extra-large`
        - component: tabs -> tab-item
    - `tab-item-start-to-edge-quiet`
        - component: tabs -> tab-item
    - `tab-item-start-to-edge-small`
        - component: tabs -> tab-item
    - `tab-item-start-to-edge-medium`
        - component: tabs -> tab-item
    - `tab-item-start-to-edge-large`
        - component: tabs -> tab-item
    - `tab-item-start-to-edge-extra-large`
        - component: tabs -> tab-item
    - `tab-item-top-to-text-small`
        - component: tabs -> tab-item
    - `tab-item-bottom-to-text-small`
        - component: tabs -> tab-item
    - `tab-item-top-to-text-medium`
        - component: tabs -> tab-item
    - `tab-item-bottom-to-text-medium`
        - component: tabs -> tab-item
    - `tab-item-top-to-text-large`
        - component: tabs -> tab-item
    - `tab-item-bottom-to-text-large`
        - component: tabs -> tab-item
    - `tab-item-top-to-text-extra-large`
        - component: tabs -> tab-item
    - `tab-item-bottom-to-text-extra-large`
        - component: tabs -> tab-item
    - `tab-item-top-to-text-compact-small`
        - component: tabs -> tab-item
    - `tab-item-bottom-to-text-compact-small`
        - component: tabs -> tab-item
    - `tab-item-top-to-text-compact-medium`
        - component: tabs -> tab-item
    - `tab-item-bottom-to-text-compact-medium`
        - component: tabs -> tab-item
    - `tab-item-top-to-text-compact-large`
        - component: tabs -> tab-item
    - `tab-item-bottom-to-text-compact-large`
        - component: tabs -> tab-item
    - `tab-item-top-to-text-compact-extra-large`
        - component: tabs -> tab-item
    - `tab-item-bottom-to-text-compact-extra-large`
        - component: tabs -> tab-item
    - `tab-item-top-to-workflow-icon-small`
        - component: tabs -> tab-item
    - `tab-item-top-to-workflow-icon-medium`
        - component: tabs -> tab-item
    - `tab-item-top-to-workflow-icon-large`
        - component: tabs -> tab-item
    - `tab-item-top-to-workflow-icon-extra-large`
        - component: tabs -> tab-item
    - `tab-item-top-to-workflow-icon-compact-small`
        - component: tabs -> tab-item
    - `tab-item-top-to-workflow-icon-compact-medium`
        - component: tabs -> tab-item
    - `tab-item-top-to-workflow-icon-compact-large`
        - component: tabs -> tab-item
    - `tab-item-top-to-workflow-icon-compact-extra-large`
        - component: tabs -> tab-item
    - `tab-item-focus-indicator-gap-small`
        - component: tabs -> tab-item
    - `tab-item-focus-indicator-gap-medium`
        - component: tabs -> tab-item
    - `tab-item-focus-indicator-gap-large`
        - component: tabs -> tab-item
    - `tab-item-focus-indicator-gap-extra-large`
        - component: tabs -> tab-item
    - `in-field-button-fill-stacked-inner-border-rounding`
        - schema: system-set.json -> dimension.json
        - uuid: 5cd31637-78a0-4d60-9d8f-8f07f5ba155e -> f8ed9a70-58f1-4f1a-9e87-24bca6d7b4e1
    - `in-field-button-edge-to-fill`
        - schema: system-set.json -> dimension.json
        - uuid: 8b2c325c-b6ee-4860-a34f-f423a3498a98 -> 5bffe992-2982-49e8-aa3a-e4e93c884f43
    - `in-field-button-stacked-inner-edge-to-fill`
        - schema: system-set.json -> dimension.json
        - uuid: 36087614-f5ac-46cd-86f9-2dc04796bd44 -> 56b54ece-0ff3-4957-9c1c-9e7fb992653c
    - `in-field-button-outer-edge-to-disclosure-icon-stacked-medium`
        - schema: system-set.json -> dimension.json
        - uuid: 04a422cc-3370-44a1-9e55-b4e8260b5958 -> a87d68bb-4249-43cd-947d-bd061baba0ef
    - `in-field-button-outer-edge-to-disclosure-icon-stacked-large`
        - schema: system-set.json -> dimension.json
        - uuid: e68a6c5f-6db6-4ef7-ac1c-9379c356d980 -> acc9c48a-f461-48ff-9f69-0224c4feabc6
    - `in-field-button-outer-edge-to-disclosure-icon-stacked-extra-large`
        - schema: system-set.json -> dimension.json
        - uuid: 4f1d0ee9-6276-42fc-824e-a8362a6140c0 -> 391e1e67-1677-4f60-a09a-3b49bacd01f5
    - `in-field-button-inner-edge-to-disclosure-icon-stacked-small`
        - schema: system-set.json -> alias.json
        - uuid: afbf364e-a945-42fe-beaf-0177a9203cc4 -> 6c1330a4-1c89-45a7-b2b1-8cbcaf20b9ab
    - `in-field-button-inner-edge-to-disclosure-icon-stacked-medium`
        - schema: system-set.json -> alias.json
        - uuid: 2f516c6f-df04-43ec-9890-151201764c40 -> 3dd5babb-5026-4f28-89ae-bfe687673f31
    - `in-field-button-inner-edge-to-disclosure-icon-stacked-large`
        - schema: system-set.json -> alias.json
        - uuid: cf1518d0-7040-4ac7-87b7-210518ceb7d1 -> 710ebe58-f0d8-4d6b-8974-0be1f2f48dc4
    - `in-field-button-inner-edge-to-disclosure-icon-stacked-extra-large`
        - schema: system-set.json -> alias.json
        - uuid: e2f9f620-b8f0-4fb7-a9b0-e78f13a0ac03 -> c47499c1-b89f-49a7-bbb5-17e83e4b306e
    - `arrow-icon-size-75`
        - component: icon -> arrow-icon
    - `arrow-icon-size-100`
        - component: icon -> arrow-icon
    - `arrow-icon-size-200`
        - component: icon -> arrow-icon
    - `arrow-icon-size-300`
        - component: icon -> arrow-icon
    - `arrow-icon-size-400`
        - component: icon -> arrow-icon
    - `arrow-icon-size-500`
        - component: icon -> arrow-icon
    - `arrow-icon-size-600`
        - component: icon -> arrow-icon
    - `asterisk-icon-size-75`
        - component: icon -> asterisk-icon
    - `asterisk-icon-size-100`
        - component: icon -> asterisk-icon
    - `asterisk-icon-size-200`
        - component: icon -> asterisk-icon
    - `asterisk-icon-size-300`
        - component: icon -> asterisk-icon
    - `checkmark-icon-size-50`
        - component: icon -> checkmark-icon
    - `checkmark-icon-size-75`
        - component: icon -> checkmark-icon
    - `checkmark-icon-size-100`
        - component: icon -> checkmark-icon
    - `checkmark-icon-size-200`
        - component: icon -> checkmark-icon
    - `checkmark-icon-size-300`
        - component: icon -> checkmark-icon
    - `checkmark-icon-size-400`
        - component: icon -> checkmark-icon
    - `checkmark-icon-size-500`
        - component: icon -> checkmark-icon
    - `checkmark-icon-size-600`
        - component: icon -> checkmark-icon
    - `chevron-icon-size-50`
        - component: icon -> chevron-icon
    - `chevron-icon-size-75`
        - component: icon -> chevron-icon
    - `chevron-icon-size-100`
        - component: icon -> chevron-icon
    - `chevron-icon-size-200`
        - component: icon -> chevron-icon
    - `chevron-icon-size-300`
        - component: icon -> chevron-icon
    - `chevron-icon-size-400`
        - component: icon -> chevron-icon
    - `chevron-icon-size-500`
        - component: icon -> chevron-icon
    - `chevron-icon-size-600`
        - component: icon -> chevron-icon
    - `cross-icon-size-75`
        - component: icon -> cross-icon
    - `cross-icon-size-100`
        - component: icon -> cross-icon
    - `cross-icon-size-200`
        - component: icon -> cross-icon
    - `cross-icon-size-300`
        - component: icon -> cross-icon
    - `cross-icon-size-400`
        - component: icon -> cross-icon
    - `cross-icon-size-500`
        - component: icon -> cross-icon
    - `cross-icon-size-600`
        - component: icon -> cross-icon
    - `dash-icon-size-50`
        - component: icon -> dash-icon
    - `dash-icon-size-75`
        - component: icon -> dash-icon
    - `dash-icon-size-100`
        - component: icon -> dash-icon
    - `dash-icon-size-200`
        - component: icon -> dash-icon
    - `dash-icon-size-300`
        - component: icon -> dash-icon
    - `dash-icon-size-400`
        - component: icon -> dash-icon
    - `dash-icon-size-500`
        - component: icon -> dash-icon
    - `dash-icon-size-600`
        - component: icon -> dash-icon
    - `accordion-top-to-text-spacious-small`
        - desktop.uuid: 1f833f34-562b-4874-9f69-db74e80ffef1 -> 696ab6c1-0c23-4868-8d6c-039d6d430d29
        - mobile.uuid: 02e96927-9f33-4878-9ce0-bb825be84bcb -> 7bcbaaf1-f1d8-4755-acb2-5f6a45c3b9fe
    - `icon-color-blue-primary-default`
        - dark.uuid: bcb2d920-29fe-4911-bfd6-058ed81a1c76 -> 1bac9a3f-4bc8-4a4d-8dfd-53c542b1d1d8
    - `icon-color-green-primary-default`
        - schema: color-set.json -> alias.json
        - uuid: d403d8a1-3ac2-4f6d-9434-6aebe4f23991 -> a0717159-cc62-4ba1-b1f1-a69dfb88c6ee
    - `icon-color-red-primary-default`
        - dark.uuid: 5a1ef31d-a55d-44e2-9ce9-68c407ba8611 -> a60f2744-ad15-4cf7-b9dc-89ca307ed444
    - `icon-color-yellow-primary-default`
        - dark.value: yellow-1000 -> yellow-1200
        - dark.uuid: 646e82ab-3762-47de-87ec-a39b68d59de9 -> 5ebf8291-23f8-4806-865d-4ebab38ff03c
    - `transparent-white-100`
        - value: rgba(255, 255, 255, 0) -> rgba(255, 255, 255, 0.11)
    - `transparent-white-200`
        - value: rgba(255, 255, 255, 0.1) -> rgba(255, 255, 255, 0.14)
    - `transparent-white-300`
        - value: rgba(255, 255, 255, 0.25) -> rgba(255, 255, 255, 0.17)
    - `transparent-white-400`
        - value: rgba(255, 255, 255, 0.4) -> rgba(255, 255, 255, 0.21)
    - `transparent-white-500`
        - value: rgba(255, 255, 255, 0.55) -> rgba(255, 255, 255, 0.39)
    - `transparent-white-600`
        - value: rgba(255, 255, 255, 0.7) -> rgba(255, 255, 255, 0.51)
    - `transparent-white-700`
        - value: rgba(255, 255, 255, 0.8) -> rgba(255, 255, 255, 0.66)
    - `transparent-white-800`
        - value: rgba(255, 255, 255, 0.9) -> rgba(255, 255, 255, 0.85)
    - `transparent-white-900`
        - value: rgb(255, 255, 255) -> rgba(255, 255, 255, 0.94)
    - `transparent-black-100`
        - value: rgba(0, 0, 0, 0) -> rgba(0, 0, 0, 0.09)
    - `transparent-black-200`
        - value: rgba(0, 0, 0, 0.1) -> rgba(0, 0, 0, 0.12)
    - `transparent-black-300`
        - value: rgba(0, 0, 0, 0.25) -> rgba(0, 0, 0, 0.15)
    - `transparent-black-400`
        - value: rgba(0, 0, 0, 0.4) -> rgba(0, 0, 0, 0.22)
    - `transparent-black-500`
        - value: rgba(0, 0, 0, 0.55) -> rgba(0, 0, 0, 0.44)
    - `transparent-black-600`
        - value: rgba(0, 0, 0, 0.7) -> rgba(0, 0, 0, 0.56)
    - `transparent-black-700`
        - value: rgba(0, 0, 0, 0.8) -> rgba(0, 0, 0, 0.69)
    - `transparent-black-800`
        - value: rgba(0, 0, 0, 0.9) -> rgba(0, 0, 0, 0.84)
    - `transparent-black-900`
        - value: rgb(0, 0, 0) -> rgba(0, 0, 0, 0.93)
    - `gray-50`
        - light.value: rgb(255, 255, 255) -> rgb(248, 248, 248)
        - dark.value: rgb(29, 29, 29) -> rgb(27, 27, 27)
        - dark.uuid: d5641118-4015-426d-bf92-7c63393b3775 -> 0913be1e-b648-4b80-9976-fd8e5e53f4fc
    - `gray-75`
        - light.value: rgb(253, 253, 253) -> rgb(243, 243, 243)
        - dark.value: rgb(38, 38, 38) -> rgb(34, 34, 34)
        - dark.uuid: 9a66da2c-7f73-4364-8674-85f794399e37 -> 1666d544-ad1b-445a-9a57-d2277fb752eb
    - `gray-100`
        - light.value: rgb(248, 248, 248) -> rgb(233, 233, 233)
        - dark.value: rgb(50, 50, 50) -> rgb(44, 44, 44)
        - dark.uuid: 4500355e-ce60-4046-b692-71301b6b1348 -> abd011c4-87a5-4b1f-82e2-e94d118f417f
    - `gray-200`
        - light.value: rgb(230, 230, 230) -> rgb(225, 225, 225)
        - dark.value: rgb(63, 63, 63) -> rgb(50, 50, 50)
        - dark.uuid: 352ca27b-fdb8-4a66-b46d-6e6994c6a19d -> 0a676e7a-8a89-4607-a918-3abcfb0234a2
    - `gray-300`
        - light.value: rgb(213, 213, 213) -> rgb(218, 218, 218)
        - dark.value: rgb(84, 84, 84) -> rgb(57, 57, 57)
        - dark.uuid: 70fe1801-98f7-4cb8-a275-8cb9f180f2fc -> cc8c4299-c40d-4e93-80b2-c052ee8aaf40
    - `gray-400`
        - light.value: rgb(177, 177, 177) -> rgb(198, 198, 198)
        - dark.value: rgb(112, 112, 112) -> rgb(68, 68, 68)
        - dark.uuid: 4ef9462d-9c24-4a0f-b205-0eb04bf242a2 -> c34dd99f-e576-4c98-a89d-86dd47514c55
    - `gray-500`
        - light.value: rgb(144, 144, 144) -> rgb(143, 143, 143)
        - dark.value: rgb(144, 144, 144) -> rgb(109, 109, 109)
        - dark.uuid: c295d2a4-0711-40a0-904c-b8d0c7e1b724 -> 05808575-f14b-49d1-aefb-e3667ec0f5a4
    - `gray-600`
        - light.value: rgb(109, 109, 109) -> rgb(113, 113, 113)
        - dark.value: rgb(178, 178, 178) -> rgb(138, 138, 138)
        - dark.uuid: 7c21df9e-eb58-44da-9bea-e2bacd494130 -> 8880b8f1-7850-49ef-a7ab-fd4e16cb37a6
    - `gray-700`
        - light.value: rgb(70, 70, 70) -> rgb(80, 80, 80)
        - dark.value: rgb(209, 209, 209) -> rgb(175, 175, 175)
        - dark.uuid: 0b0dc002-bbda-46bf-a0fa-6d361009e31c -> 3cc563c6-386e-4b08-850d-68d4a292e559
    - `gray-800`
        - light.value: rgb(34, 34, 34) -> rgb(41, 41, 41)
        - dark.value: rgb(235, 235, 235) -> rgb(219, 219, 219)
        - dark.uuid: bca0223a-6639-4881-a7a4-e131c28968e7 -> d39fc368-ec71-40cd-85e9-afb07862f2b7
    - `gray-900`
        - light.value: rgb(0, 0, 0) -> rgb(19, 19, 19)
        - dark.value: rgb(255, 255, 255) -> rgb(242, 242, 242)
        - dark.uuid: 1ea0996b-81ab-4182-a86f-fd51a829eb96 -> 90d25d68-afb1-4b2a-9dba-3fe22d44976f
    - `blue-100`
        - light.value: rgb(224, 242, 255) -> rgb(245, 249, 255)
        - dark.value: rgb(0, 56, 119) -> rgb(14, 23, 63)
        - dark.uuid: 03fd9144-0640-4bb0-83bd-677a4e48c128 -> 7d56ac58-fd58-41b3-9bbd-448ae0a7dd85
        - wireframe.value: rgb(242, 245, 251) -> rgb(246, 248, 252)
    - `blue-200`
        - light.value: rgb(202, 232, 255) -> rgb(229, 240, 254)
        - dark.value: rgb(0, 65, 138) -> rgb(15, 28, 82)
        - dark.uuid: acb6d305-c1d9-498a-9db3-5d8e921dccda -> 7b7d1fd8-cc1e-4053-b320-e481b8f64c46
        - wireframe.value: rgb(237, 241, 250) -> rgb(235, 239, 248)
    - `blue-300`
        - light.value: rgb(181, 222, 255) -> rgb(203, 226, 254)
        - dark.value: rgb(0, 77, 163) -> rgb(12, 33, 117)
        - dark.uuid: da78a0bb-b306-4ff2-8080-bdf21ca6bed3 -> d88d1685-29dc-486b-a0b9-9c90f60b8cde
        - wireframe.value: rgb(233, 238, 248) -> rgb(216, 224, 242)
    - `blue-400`
        - light.value: rgb(150, 206, 253) -> rgb(172, 207, 253)
        - dark.value: rgb(0, 89, 194) -> rgb(18, 45, 154)
        - dark.uuid: 9729fbd6-6eb6-4c91-a73e-d0bd3ffbd1f3 -> 29d339bb-ef80-40f8-a69b-afa778b60805
        - wireframe.value: rgb(226, 232, 247) -> rgb(192, 205, 234)
    - `blue-500`
        - light.value: rgb(120, 187, 250) -> rgb(142, 185, 252)
        - dark.value: rgb(3, 103, 224) -> rgb(26, 58, 195)
        - dark.uuid: 209d7715-b78a-4265-908f-6d9a03e63bb1 -> a61ed901-7f77-4667-9d19-fff6bab20623
        - wireframe.value: rgb(216, 225, 244) -> rgb(164, 183, 225)
    - `blue-600`
        - light.value: rgb(89, 167, 246) -> rgb(114, 158, 253)
        - dark.value: rgb(19, 121, 243) -> rgb(37, 73, 229)
        - dark.uuid: 8e465599-1ad1-45f7-8db3-99caed033cfe -> 7e770996-780a-4494-91ea-08c1ae6cfa80
        - wireframe.value: rgb(203, 215, 241) -> rgb(135, 160, 215)
    - `blue-700`
        - light.value: rgb(56, 146, 243) -> rgb(93, 137, 255)
        - dark.value: rgb(52, 143, 244) -> rgb(52, 91, 248)
        - dark.uuid: 9260c8ad-9e25-4103-baf2-ea008746a2f7 -> 5cc66280-e13a-459d-8529-c3f531aa5e4e
        - wireframe.value: rgb(190, 205, 237) -> rgb(113, 142, 208)
    - `blue-800`
        - light.value: rgb(20, 122, 243) -> rgb(75, 117, 255)
        - dark.value: rgb(84, 163, 246) -> rgb(64, 105, 253)
        - dark.uuid: 10aaf031-3586-47a6-90f5-c698f6be5bd6 -> cf0bafc5-f5c6-4986-a17a-6660dc542b71
        - wireframe.value: rgb(173, 192, 233) -> rgb(93, 127, 201)
    - `blue-900`
        - light.value: rgb(2, 101, 220) -> rgb(59, 99, 251)
        - dark.value: rgb(114, 183, 249) -> rgb(86, 129, 255)
        - dark.uuid: 2251d00a-e90d-4758-91af-50c1c37232fe -> 82b09b04-6a70-4a95-9eb5-a321a66a6465
        - wireframe.value: rgb(154, 177, 227) -> rgb(74, 111, 195)
    - `blue-1000`
        - light.value: rgb(0, 84, 182) -> rgb(39, 77, 234)
        - dark.value: rgb(143, 202, 252) -> rgb(105, 149, 254)
        - dark.uuid: f9a4d76d-cbf9-482d-b582-01462f1ca969 -> 147ed079-b4f0-4cd7-89cd-7ec93750d688
        - wireframe.value: rgb(133, 161, 219) -> rgb(61, 94, 165)
    - `blue-1100`
        - light.value: rgb(0, 68, 145) -> rgb(29, 62, 207)
        - dark.value: rgb(174, 219, 254) -> rgb(124, 169, 252)
        - dark.uuid: 94fd01de-1609-4dad-8e91-c0ce904aa743 -> 2a5d2e32-930d-4c50-b1fd-6781a1dc1db5
        - wireframe.value: rgb(114, 145, 211) -> rgb(52, 79, 140)
    - `blue-1200`
        - light.value: rgb(0, 53, 113) -> rgb(21, 50, 173)
        - dark.value: rgb(204, 233, 255) -> rgb(152, 192, 252)
        - dark.uuid: 064dfc3f-d7fa-46c1-a4a4-21bc5b2f18d5 -> ce7da4ba-77ed-4bdd-a154-90f389af6c2a
        - wireframe.value: rgb(96, 130, 201) -> rgb(42, 65, 114)
    - `blue-1300`
        - light.value: rgb(0, 39, 84) -> rgb(16, 40, 140)
        - dark.value: rgb(232, 246, 255) -> rgb(181, 213, 253)
        - dark.uuid: 96f80a02-6ecf-4e17-b1f0-e508d8b0d422 -> 2bc63c0d-691c-4cc4-95b6-b4e530a44978
        - wireframe.value: rgb(82, 117, 192) -> rgb(34, 51, 91)
    - `blue-1400`
        - light.value: rgb(0, 28, 60) -> rgb(12, 31, 105)
        - dark.value: rgb(255, 255, 255) -> rgb(213, 231, 254)
        - dark.uuid: 2d4fbd92-649f-457e-ad5c-39798f3da5a8 -> eb86d777-ec23-47e4-adc6-1203709dc00d
        - wireframe.value: rgb(74, 109, 184) -> rgb(25, 39, 69)
    - `red-100`
        - light.value: rgb(255, 235, 231) -> rgb(255, 246, 245)
        - dark.value: rgb(123, 0, 0) -> rgb(54, 10, 3)
        - dark.uuid: 9e721c6e-a111-411c-a892-55bf69fcd169 -> 04f6044b-d0fa-4705-858c-2dc5721ec30f
        - wireframe.value: rgb(242, 245, 251) -> rgb(246, 248, 252)
    - `red-200`
        - light.value: rgb(255, 221, 214) -> rgb(255, 235, 232)
        - dark.value: rgb(141, 0, 0) -> rgb(68, 13, 5)
        - dark.uuid: 803d7924-3746-43b0-ab32-6b4b5f4dae19 -> b18ca77b-898e-4e09-88e2-8901de3e9172
        - wireframe.value: rgb(237, 241, 250) -> rgb(235, 239, 248)
    - `red-300`
        - light.value: rgb(255, 205, 195) -> rgb(255, 214, 209)
        - dark.value: rgb(165, 0, 0) -> rgb(87, 17, 7)
        - dark.uuid: 330ceaaf-c223-44b9-9548-7ee41e6ca590 -> fcfcf026-be31-4a05-b833-6757cacb8b05
        - wireframe.value: rgb(233, 238, 248) -> rgb(216, 224, 242)
    - `red-400`
        - light.value: rgb(255, 183, 169) -> rgb(255, 188, 180)
        - dark.value: rgb(190, 4, 3) -> rgb(115, 24, 11)
        - dark.uuid: e3eb789d-b34a-467e-a195-77aaee2f0d6b -> 8f9fa135-5aca-4e42-b247-fdfbf74bc07b
        - wireframe.value: rgb(226, 232, 247) -> rgb(192, 205, 234)
    - `red-500`
        - light.value: rgb(255, 155, 136) -> rgb(255, 157, 145)
        - dark.value: rgb(215, 25, 19) -> rgb(147, 31, 17)
        - dark.uuid: c6b687eb-7999-4ef4-a680-aa15581db960 -> ec50a21c-88aa-41a8-b607-c8b1c407ac4f
        - wireframe.value: rgb(216, 225, 244) -> rgb(164, 183, 225)
    - `red-600`
        - light.value: rgb(255, 124, 101) -> rgb(255, 118, 101)
        - dark.value: rgb(234, 56, 41) -> rgb(177, 38, 23)
        - dark.uuid: b4423bfa-8732-42df-ba45-361d1987bc0b -> ff0fa040-17d6-4570-84b5-7a88c5bb9f45
        - wireframe.value: rgb(203, 215, 241) -> rgb(135, 160, 215)
    - `red-700`
        - light.value: rgb(247, 92, 70) -> rgb(255, 81, 61)
        - dark.value: rgb(246, 88, 67) -> rgb(205, 46, 29)
        - dark.uuid: ba040391-245e-4cd5-b499-9d3f9d82dedb -> cb2486de-b2be-45e5-b459-6e371b29d357
        - wireframe.value: rgb(190, 205, 237) -> rgb(113, 142, 208)
    - `red-800`
        - light.value: rgb(234, 56, 41) -> rgb(240, 56, 35)
        - dark.value: rgb(255, 117, 94) -> rgb(223, 52, 34)
        - dark.uuid: f1e2ab4f-0bca-4c9e-ac63-18d36726560e -> 9ff36ad0-608e-46a7-ab56-00af3d307d83
        - wireframe.value: rgb(173, 192, 233) -> rgb(93, 127, 201)
    - `red-900`
        - light.value: rgb(211, 21, 16) -> rgb(215, 50, 32)
        - dark.value: rgb(255, 149, 129) -> rgb(252, 67, 46)
        - dark.uuid: c71c3423-88ee-4611-b07b-58630ce081f0 -> ccb79099-59f4-4bf2-b149-0de72f556a45
        - wireframe.value: rgb(154, 177, 227) -> rgb(74, 111, 195)
    - `red-1000`
        - light.value: rgb(180, 0, 0) -> rgb(183, 40, 24)
        - dark.value: rgb(255, 176, 161) -> rgb(255, 103, 86)
        - dark.uuid: e584aa4f-7e8f-4815-a9ca-f9804e233f5d -> 95621c5a-1768-4707-a2ce-bd15c61c89f4
        - wireframe.value: rgb(133, 161, 219) -> rgb(61, 94, 165)
    - `red-1100`
        - light.value: rgb(147, 0, 0) -> rgb(156, 33, 19)
        - dark.value: rgb(255, 201, 189) -> rgb(255, 134, 120)
        - dark.uuid: 843a8bc9-646d-44e0-b6c0-728186ebc983 -> 53617d38-1075-4b47-87c7-4695b385a2d7
        - wireframe.value: rgb(114, 145, 211) -> rgb(52, 79, 140)
    - `red-1200`
        - light.value: rgb(116, 0, 0) -> rgb(129, 27, 14)
        - dark.value: rgb(255, 222, 216) -> rgb(255, 167, 157)
        - dark.uuid: 34ad97a7-a6ee-4240-9eef-596694bf6e6b -> e7820c1c-ff58-431d-b521-b81ee3281db0
        - wireframe.value: rgb(96, 130, 201) -> rgb(42, 65, 114)
    - `red-1300`
        - light.value: rgb(89, 0, 0) -> rgb(104, 21, 10)
        - dark.value: rgb(255, 241, 238) -> rgb(255, 196, 189)
        - dark.uuid: 27f9bb17-392f-4707-971e-1f42ebf2b3d9 -> 7691bca6-3749-4cb7-a950-a94fe3d2910f
        - wireframe.value: rgb(82, 117, 192) -> rgb(34, 51, 91)
    - `red-1400`
        - light.value: rgb(67, 0, 0) -> rgb(80, 16, 6)
        - dark.value: rgb(255, 255, 255) -> rgb(255, 222, 219)
        - dark.uuid: bb706c45-98ac-4fbe-b838-d42d930d31c0 -> aaafa24c-cb3c-48cd-9cb7-e164be140ab5
        - wireframe.value: rgb(74, 109, 184) -> rgb(25, 39, 69)
    - `orange-100`
        - light.value: rgb(255, 236, 204) -> rgb(255, 246, 231)
        - dark.value: rgb(102, 37, 0) -> rgb(49, 16, 0)
        - dark.uuid: 507c23ac-f6a7-4820-b052-c129975eaa20 -> 974ab8ec-6691-4696-b38c-77e16fb3df88
        - wireframe.value: rgb(242, 245, 251) -> rgb(246, 248, 252)
    - `orange-200`
        - light.value: rgb(255, 223, 173) -> rgb(255, 236, 207)
        - dark.value: rgb(117, 45, 0) -> rgb(61, 21, 0)
        - dark.uuid: abba55d6-d5e0-445a-af5f-c61b58ee148d -> 587d4ce3-4275-4d2a-916c-2b1bf78c38ea
        - wireframe.value: rgb(237, 241, 250) -> rgb(235, 239, 248)
    - `orange-300`
        - light.value: rgb(253, 210, 145) -> rgb(255, 218, 158)
        - dark.value: rgb(137, 55, 0) -> rgb(80, 27, 0)
        - dark.uuid: 38a3144d-99ef-4b82-9742-e15bf64bdae4 -> 74f40bbb-5afd-4c88-89d3-e69de9e2b604
        - wireframe.value: rgb(233, 238, 248) -> rgb(216, 224, 242)
    - `orange-400`
        - light.value: rgb(255, 187, 99) -> rgb(255, 193, 94)
        - dark.value: rgb(158, 66, 0) -> rgb(106, 36, 0)
        - dark.uuid: 88889af1-222d-466a-b283-2a5bf6b577c8 -> b912089a-b6c9-49ef-8a4b-0a1f6fbbe963
        - wireframe.value: rgb(226, 232, 247) -> rgb(192, 205, 234)
    - `orange-500`
        - light.value: rgb(255, 160, 55) -> rgb(255, 162, 19)
        - dark.value: rgb(180, 78, 0) -> rgb(135, 47, 0)
        - dark.uuid: f447dc9f-3375-4b1e-8813-7952734f6aa6 -> 8a56b352-d7d4-45d4-b403-448557656dab
        - wireframe.value: rgb(216, 225, 244) -> rgb(164, 183, 225)
    - `orange-600`
        - light.value: rgb(246, 133, 17) -> rgb(252, 125, 0)
        - dark.value: rgb(202, 93, 0) -> rgb(162, 59, 0)
        - dark.uuid: 527058c0-0e17-42bc-903f-c43db0c9cb9d -> 27b198b5-bf02-476a-a440-84c9a5bd2ce3
        - wireframe.value: rgb(203, 215, 241) -> rgb(135, 160, 215)
    - `orange-700`
        - light.value: rgb(228, 111, 0) -> rgb(232, 106, 0)
        - dark.value: rgb(225, 109, 0) -> rgb(185, 73, 0)
        - dark.uuid: 7816c1b2-49da-455e-a21f-4e82011f4dca -> f9e84513-57d6-4786-b8db-c86055cebfc6
        - wireframe.value: rgb(190, 205, 237) -> rgb(113, 142, 208)
    - `orange-800`
        - light.value: rgb(203, 93, 0) -> rgb(212, 91, 0)
        - dark.value: rgb(244, 129, 12) -> rgb(199, 82, 0)
        - dark.uuid: 21d33346-5120-4b05-9d50-b027fd44c7a5 -> 5a88ed4e-94f9-4533-ab13-3995b5a60a5a
        - wireframe.value: rgb(173, 192, 233) -> rgb(93, 127, 201)
    - `orange-900`
        - light.value: rgb(177, 76, 0) -> rgb(194, 78, 0)
        - dark.value: rgb(254, 154, 46) -> rgb(224, 100, 0)
        - dark.uuid: c3569470-05da-4825-a9cc-3e7ea1699fcd -> 0fbe4f46-02a8-444d-ace5-c245c6f15112
        - wireframe.value: rgb(154, 177, 227) -> rgb(74, 111, 195)
    - `orange-1000`
        - light.value: rgb(149, 61, 0) -> rgb(167, 62, 0)
        - dark.value: rgb(255, 181, 88) -> rgb(243, 117, 0)
        - dark.uuid: 02631a05-4d8e-4eed-af1f-e6c1f8c9c031 -> 92e06ff6-8347-4320-9a98-3054ba458d0e
        - wireframe.value: rgb(133, 161, 219) -> rgb(61, 94, 165)
    - `orange-1100`
        - light.value: rgb(122, 47, 0) -> rgb(144, 51, 0)
        - dark.value: rgb(253, 206, 136) -> rgb(255, 137, 0)
        - dark.uuid: aacaf0f0-b22a-4b25-9c87-6119c04ff035 -> a571e2cd-2aff-4344-b608-45a48162cb61
        - wireframe.value: rgb(114, 145, 211) -> rgb(52, 79, 140)
    - `orange-1200`
        - light.value: rgb(97, 35, 0) -> rgb(118, 41, 0)
        - dark.value: rgb(255, 225, 179) -> rgb(255, 173, 45)
        - dark.uuid: 39d4fb83-3982-439c-a9f9-bd95ab2ba7e4 -> 8e3fe8e0-2b14-4331-869f-de2680ea60ac
        - wireframe.value: rgb(96, 130, 201) -> rgb(42, 65, 114)
    - `orange-1300`
        - light.value: rgb(73, 25, 1) -> rgb(95, 32, 0)
        - dark.value: rgb(255, 242, 221) -> rgb(255, 201, 116)
        - dark.uuid: 7f4eca34-effb-4749-8e80-b4b24dd96186 -> 06afaefe-7e0a-42e2-99b5-e62674e1185d
        - wireframe.value: rgb(82, 117, 192) -> rgb(34, 51, 91)
    - `orange-1400`
        - light.value: rgb(53, 18, 1) -> rgb(73, 24, 0)
        - dark.value: rgb(255, 253, 249) -> rgb(255, 225, 178)
        - dark.uuid: cf947ed5-5665-4b46-aead-e18f2477ed48 -> 9f2f551f-b606-48ce-9493-888587d3ccb6
        - wireframe.value: rgb(74, 109, 184) -> rgb(25, 39, 69)
    - `yellow-100`
        - light.value: rgb(251, 241, 152) -> rgb(255, 248, 204)
        - dark.value: rgb(76, 54, 0) -> rgb(37, 23, 0)
        - dark.uuid: f18c112a-3abe-4a68-b671-f4e0a4e9ee80 -> 7bef094a-1523-4392-a0ca-59c48409f17a
        - wireframe.value: rgb(242, 245, 251) -> rgb(246, 248, 252)
    - `yellow-200`
        - light.value: rgb(248, 231, 80) -> rgb(255, 241, 151)
        - dark.value: rgb(88, 64, 0) -> rgb(47, 29, 0)
        - dark.uuid: b5c57a8b-ba79-40ff-9710-016e4503f134 -> f4fdc925-63b3-4670-9f2b-a057c27c834a
        - wireframe.value: rgb(237, 241, 250) -> rgb(235, 239, 248)
    - `yellow-300`
        - light.value: rgb(248, 217, 4) -> rgb(255, 222, 44)
        - dark.value: rgb(103, 76, 0) -> rgb(61, 39, 0)
        - dark.uuid: 6735b5e5-4ce3-4fff-bb1f-497b8932c908 -> 238147c6-0302-4d43-b3a3-42df832c7857
        - wireframe.value: rgb(233, 238, 248) -> rgb(216, 224, 242)
    - `yellow-400`
        - light.value: rgb(232, 198, 0) -> rgb(245, 199, 0)
        - dark.value: rgb(119, 89, 0) -> rgb(83, 52, 0)
        - dark.uuid: e8802954-19e6-450c-a75a-7202e5a5023c -> 62ab6892-66ea-4b55-8c1a-fcc191d29717
        - wireframe.value: rgb(226, 232, 247) -> rgb(192, 205, 234)
    - `yellow-500`
        - light.value: rgb(215, 179, 0) -> rgb(230, 175, 0)
        - dark.value: rgb(136, 104, 0) -> rgb(107, 67, 0)
        - dark.uuid: 5d1e7587-c787-43cf-a17c-3bd9acc800af -> efa1fdd8-4478-411a-892c-0ecf23939489
        - wireframe.value: rgb(216, 225, 244) -> rgb(164, 183, 225)
    - `yellow-600`
        - light.value: rgb(196, 159, 0) -> rgb(210, 149, 0)
        - dark.value: rgb(155, 120, 0) -> rgb(130, 82, 0)
        - dark.uuid: 6ce0efce-3c8c-4108-92b3-78f2088a7c83 -> 8ae3c5ec-aabe-47a0-b822-ba0907e67ed4
        - wireframe.value: rgb(203, 215, 241) -> rgb(135, 160, 215)
    - `yellow-700`
        - light.value: rgb(176, 140, 0) -> rgb(193, 131, 0)
        - dark.value: rgb(174, 137, 0) -> rgb(151, 97, 0)
        - dark.uuid: b0ccfc1b-2992-4d00-aa90-2990197f8a02 -> ac3e5d40-51eb-45aa-b4e0-87d3f6e8e359
        - wireframe.value: rgb(190, 205, 237) -> rgb(113, 142, 208)
    - `yellow-800`
        - light.value: rgb(155, 120, 0) -> rgb(175, 116, 0)
        - dark.value: rgb(192, 156, 0) -> rgb(164, 106, 0)
        - dark.uuid: aab14913-8d2a-428b-acb4-3c03529b4c20 -> 67e8d9aa-d843-4536-9c97-bd51e62da8ee
        - wireframe.value: rgb(173, 192, 233) -> rgb(93, 127, 201)
    - `yellow-900`
        - light.value: rgb(133, 102, 0) -> rgb(158, 102, 0)
        - dark.value: rgb(211, 174, 0) -> rgb(186, 124, 0)
        - dark.uuid: fba8d22e-6db1-4146-8554-8a9f819b09c3 -> a12f6cac-7fdc-4fd4-8120-ad957823ff6b
        - wireframe.value: rgb(154, 177, 227) -> rgb(74, 111, 195)
    - `yellow-1000`
        - light.value: rgb(112, 83, 0) -> rgb(134, 85, 0)
        - dark.value: rgb(228, 194, 0) -> rgb(203, 141, 0)
        - dark.uuid: 48c1ac65-4ffc-4bcc-b7c0-1c7263d1a5f2 -> 4cf4a500-37a2-4dd8-a243-14f6c012b53c
        - wireframe.value: rgb(133, 161, 219) -> rgb(61, 94, 165)
    - `yellow-1100`
        - light.value: rgb(91, 67, 0) -> rgb(114, 72, 0)
        - dark.value: rgb(244, 213, 0) -> rgb(218, 159, 0)
        - dark.uuid: d6609e5e-813f-40a3-ba85-81e8e4ba533a -> 4eee9daf-e19d-4e0b-b12d-4fdcc4852956
        - wireframe.value: rgb(114, 145, 211) -> rgb(52, 79, 140)
    - `yellow-1200`
        - light.value: rgb(72, 51, 0) -> rgb(93, 59, 0)
        - dark.value: rgb(249, 232, 92) -> rgb(235, 183, 0)
        - dark.uuid: e652bbeb-ea99-466e-aba9-ab40c8af690d -> 69059dfa-e2e1-4f8d-b06b-058a8724e071
        - wireframe.value: rgb(96, 130, 201) -> rgb(42, 65, 114)
    - `yellow-1300`
        - light.value: rgb(54, 37, 0) -> rgb(75, 47, 0)
        - dark.value: rgb(252, 246, 187) -> rgb(249, 206, 0)
        - dark.uuid: ce6cae94-1b85-4a88-a582-c16750e2994d -> b2a1039c-cbfe-44bf-a0fe-822c5f576f52
        - wireframe.value: rgb(82, 117, 192) -> rgb(34, 51, 91)
    - `yellow-1400`
        - light.value: rgb(40, 26, 0) -> rgb(56, 35, 0)
        - dark.value: rgb(255, 255, 255) -> rgb(255, 230, 86)
        - dark.uuid: bf7b43f5-b6b9-4ba5-bbd1-406145088d66 -> dfd355e7-82fd-4fdb-96bd-b584d7268ee9
        - wireframe.value: rgb(74, 109, 184) -> rgb(25, 39, 69)
    - `chartreuse-100`
        - light.value: rgb(219, 252, 110) -> rgb(246, 251, 222)
        - dark.value: rgb(48, 64, 0) -> rgb(23, 28, 0)
        - dark.uuid: fe55390b-676c-42c3-bcaa-fc5295d59c3c -> bdc6a473-3109-44c6-9e2f-198d3224d75f
        - wireframe.value: rgb(242, 245, 251) -> rgb(246, 248, 252)
    - `chartreuse-200`
        - light.value: rgb(203, 244, 67) -> rgb(234, 246, 173)
        - dark.value: rgb(55, 74, 0) -> rgb(30, 36, 0)
        - dark.uuid: 76dda145-58f8-448a-b37a-2f4b2d4f7fdd -> b18f4550-5bbe-496c-b4a5-13df8fd0c7d7
        - wireframe.value: rgb(237, 241, 250) -> rgb(235, 239, 248)
    - `chartreuse-300`
        - light.value: rgb(188, 233, 42) -> rgb(208, 236, 70)
        - dark.value: rgb(65, 87, 0) -> rgb(39, 47, 0)
        - dark.uuid: 4dd24fac-30ad-45a2-825f-3573c84496e8 -> b98dec90-df71-4593-946d-91df7918caac
        - wireframe.value: rgb(233, 238, 248) -> rgb(216, 224, 242)
    - `chartreuse-400`
        - light.value: rgb(170, 216, 22) -> rgb(182, 219, 0)
        - dark.value: rgb(76, 102, 0) -> rgb(53, 63, 0)
        - dark.uuid: ba474593-d290-441c-8077-b74c098f59d2 -> 6a974b7d-ccd2-4778-baae-8caf419a529c
        - wireframe.value: rgb(226, 232, 247) -> rgb(192, 205, 234)
    - `chartreuse-500`
        - light.value: rgb(152, 197, 10) -> rgb(163, 196, 0)
        - dark.value: rgb(89, 118, 0) -> rgb(68, 82, 0)
        - dark.uuid: 234a0a76-ffd8-4d22-8d66-21e0f84c42d2 -> 46d8fd3b-0e51-4cdd-a33c-de184b82dcc5
        - wireframe.value: rgb(216, 225, 244) -> rgb(164, 183, 225)
    - `chartreuse-600`
        - light.value: rgb(135, 177, 3) -> rgb(143, 172, 0)
        - dark.value: rgb(102, 136, 0) -> rgb(83, 100, 0)
        - dark.uuid: efd39a1a-549c-4742-918b-bec4ea48539b -> 965174d2-e743-41df-a8e2-570b2ae2f447
        - wireframe.value: rgb(203, 215, 241) -> rgb(135, 160, 215)
    - `chartreuse-700`
        - light.value: rgb(118, 156, 0) -> rgb(128, 153, 0)
        - dark.value: rgb(117, 154, 0) -> rgb(97, 116, 0)
        - dark.uuid: d8876d4a-e6d0-447b-80ec-3804221d4b7b -> a615bb51-0249-4201-b1c9-1c6269b82ec2
        - wireframe.value: rgb(190, 205, 237) -> rgb(113, 142, 208)
    - `chartreuse-800`
        - light.value: rgb(103, 136, 0) -> rgb(114, 137, 0)
        - dark.value: rgb(132, 173, 1) -> rgb(106, 127, 0)
        - dark.uuid: 82546f0c-0707-4767-ad1f-2fae18434d91 -> 343f1685-2314-4a64-bc7a-5b7b3fd9fdcf
        - wireframe.value: rgb(173, 192, 233) -> rgb(93, 127, 201)
    - `chartreuse-900`
        - light.value: rgb(87, 116, 0) -> rgb(102, 122, 0)
        - dark.value: rgb(148, 192, 8) -> rgb(122, 147, 0)
        - dark.uuid: 8a0c7b2d-66fc-499a-bb16-fd18a42ef2ed -> 1637c50e-88e4-4273-8a75-6e8a233a690c
        - wireframe.value: rgb(154, 177, 227) -> rgb(74, 111, 195)
    - `chartreuse-1000`
        - light.value: rgb(72, 96, 0) -> rgb(86, 103, 0)
        - dark.value: rgb(166, 211, 18) -> rgb(136, 164, 0)
        - dark.uuid: 7feea643-ca0a-4aca-8acf-da425fbe99a4 -> 7dbedc59-e21c-4953-a7af-5e91d170604a
        - wireframe.value: rgb(133, 161, 219) -> rgb(61, 94, 165)
    - `chartreuse-1100`
        - light.value: rgb(58, 77, 0) -> rgb(73, 87, 0)
        - dark.value: rgb(184, 229, 37) -> rgb(151, 181, 0)
        - dark.uuid: 550e1eb2-bbe0-4a14-8e53-d15dc06cee35 -> 90417b40-97dd-47b3-9dbc-4ac45f8e4a5f
        - wireframe.value: rgb(114, 145, 211) -> rgb(52, 79, 140)
    - `chartreuse-1200`
        - light.value: rgb(44, 59, 0) -> rgb(60, 71, 0)
        - dark.value: rgb(205, 245, 71) -> rgb(169, 203, 0)
        - dark.uuid: 07b5da40-2e3c-43bf-959a-45ceb8bf9940 -> e4b04d5d-e99d-41c5-8b24-540d653ef3ff
        - wireframe.value: rgb(96, 130, 201) -> rgb(42, 65, 114)
    - `chartreuse-1300`
        - light.value: rgb(33, 44, 0) -> rgb(47, 57, 0)
        - dark.value: rgb(231, 254, 154) -> rgb(187, 225, 0)
        - dark.uuid: 3ab82f98-3b65-4412-adef-57c1e4833421 -> 615841b9-08b2-4e21-981a-b8f5247e9e89
        - wireframe.value: rgb(82, 117, 192) -> rgb(34, 51, 91)
    - `chartreuse-1400`
        - light.value: rgb(24, 31, 0) -> rgb(35, 43, 0)
        - dark.value: rgb(255, 255, 255) -> rgb(219, 240, 117)
        - dark.uuid: 5ac81a8e-2997-4b8f-aa21-ca335b0f3cfe -> a75188c9-02e3-4337-8056-9a6f8f39001f
        - wireframe.value: rgb(74, 109, 184) -> rgb(25, 39, 69)
    - `celery-100`
        - light.value: rgb(205, 252, 191) -> rgb(235, 255, 220)
        - dark.value: rgb(0, 69, 10) -> rgb(11, 31, 0)
        - dark.uuid: c711d2ee-7915-40f4-bf2e-ac3f31d60311 -> 43feed9a-9a2a-44e0-9506-9bc5eb8eab1d
        - wireframe.value: rgb(242, 245, 251) -> rgb(246, 248, 252)
    - `celery-200`
        - light.value: rgb(174, 246, 157) -> rgb(197, 255, 156)
        - dark.value: rgb(0, 80, 12) -> rgb(15, 38, 0)
        - dark.uuid: 96d6a7b1-617c-44db-9ef3-d70063895351 -> 741a30fb-62a9-4c76-a78e-cc2590af9c7d
        - wireframe.value: rgb(237, 241, 250) -> rgb(235, 239, 248)
    - `celery-300`
        - light.value: rgb(150, 238, 133) -> rgb(157, 247, 92)
        - dark.value: rgb(0, 94, 14) -> rgb(21, 51, 1)
        - dark.uuid: b1432da5-d086-4e16-b7dd-fd9d92fef470 -> 5eda4487-8f82-48ed-8b22-aa38601bbf88
        - wireframe.value: rgb(233, 238, 248) -> rgb(216, 224, 242)
    - `celery-400`
        - light.value: rgb(114, 224, 106) -> rgb(129, 228, 58)
        - dark.value: rgb(0, 109, 15) -> rgb(31, 67, 4)
        - dark.uuid: c573ed43-0055-47ff-8c3b-de32582b521e -> 646d80c1-7073-4e13-bbfe-4bd0c2226079
        - wireframe.value: rgb(226, 232, 247) -> rgb(192, 205, 234)
    - `celery-500`
        - light.value: rgb(78, 207, 80) -> rgb(110, 206, 42)
        - dark.value: rgb(0, 127, 15) -> rgb(41, 86, 8)
        - dark.uuid: 350fb94c-ae2b-4843-808c-a8b6a55a0596 -> 7d4c282b-78ce-4b2c-ab39-26bf02366e4d
        - wireframe.value: rgb(216, 225, 244) -> rgb(164, 183, 225)
    - `celery-600`
        - light.value: rgb(39, 187, 54) -> rgb(93, 180, 31)
        - dark.value: rgb(0, 145, 18) -> rgb(50, 105, 11)
        - dark.uuid: f24733a3-e55f-467d-b757-4ebf620b8c22 -> 260d8921-3810-4a5d-a20f-cd00170cf951
        - wireframe.value: rgb(203, 215, 241) -> rgb(135, 160, 215)
    - `celery-700`
        - light.value: rgb(7, 167, 33) -> rgb(82, 161, 25)
        - dark.value: rgb(4, 165, 30) -> rgb(60, 122, 15)
        - dark.uuid: 983d90f4-9b72-4a6b-a6fd-7934e425a305 -> 7e7e6abb-a2e9-4308-ac8e-e6866ec17c64
        - wireframe.value: rgb(190, 205, 237) -> rgb(113, 142, 208)
    - `celery-800`
        - light.value: rgb(0, 145, 18) -> rgb(72, 144, 20)
        - dark.value: rgb(34, 184, 51) -> rgb(66, 134, 18)
        - dark.uuid: 8f3ec908-66e4-48da-b129-9bb3420e11e5 -> 3b130e0d-eb9b-49e6-84db-eda6ee95eee5
        - wireframe.value: rgb(173, 192, 233) -> rgb(93, 127, 201)
    - `celery-900`
        - light.value: rgb(0, 124, 15) -> rgb(64, 129, 17)
        - dark.value: rgb(68, 202, 73) -> rgb(78, 154, 23)
        - dark.uuid: 48c0f87a-4d30-4626-b7f0-3e697f08ed49 -> 706f3a95-ab27-497f-aab7-f4ed806eef30
        - wireframe.value: rgb(154, 177, 227) -> rgb(74, 111, 195)
    - `celery-1000`
        - light.value: rgb(0, 103, 15) -> rgb(52, 109, 12)
        - dark.value: rgb(105, 220, 99) -> rgb(88, 172, 28)
        - dark.uuid: c2f2caa8-d043-4213-a79e-23a0868e62f7 -> 021a55b8-26ae-4767-82fb-06b20c58762b
        - wireframe.value: rgb(133, 161, 219) -> rgb(61, 94, 165)
    - `celery-1100`
        - light.value: rgb(0, 83, 13) -> rgb(44, 92, 9)
        - dark.value: rgb(142, 235, 127) -> rgb(100, 190, 35)
        - dark.uuid: dcb055d0-c653-4b49-8b40-93d4d8b6e25e -> e091babe-6e02-4393-a67e-63222ab860b4
        - wireframe.value: rgb(114, 145, 211) -> rgb(52, 79, 140)
    - `celery-1200`
        - light.value: rgb(0, 64, 10) -> rgb(35, 75, 6)
        - dark.value: rgb(180, 247, 162) -> rgb(116, 213, 46)
        - dark.uuid: 73da5344-395b-43ff-bb50-7dd5f2dbc225 -> 9913e84a-4070-476f-a570-a16781a924cf
        - wireframe.value: rgb(96, 130, 201) -> rgb(42, 65, 114)
    - `celery-1300`
        - light.value: rgb(0, 48, 7) -> rgb(27, 60, 3)
        - dark.value: rgb(221, 253, 211) -> rgb(136, 234, 65)
        - dark.uuid: 82e856f7-e76e-4b5b-be5b-46d3eb113c5f -> d2d8dc91-da75-4c56-a0d8-e6e9802434ad
        - wireframe.value: rgb(82, 117, 192) -> rgb(34, 51, 91)
    - `celery-1400`
        - light.value: rgb(0, 34, 5) -> rgb(19, 46, 0)
        - dark.value: rgb(255, 255, 255) -> rgb(170, 251, 112)
        - dark.uuid: 963eafe6-3738-4470-a5dd-938e9f9c15aa -> c5c3c68c-8293-4ebb-a8d1-9f4af902906e
        - wireframe.value: rgb(74, 109, 184) -> rgb(25, 39, 69)
    - `green-100`
        - light.value: rgb(206, 248, 224) -> rgb(237, 252, 241)
        - dark.value: rgb(4, 67, 41) -> rgb(0, 30, 23)
        - dark.uuid: c13e61ca-4448-47fe-ab6b-156a62e18057 -> e5a14d4a-47c5-4a53-84c5-589a0749d906
        - wireframe.value: rgb(242, 245, 251) -> rgb(246, 248, 252)
    - `green-200`
        - light.value: rgb(173, 244, 206) -> rgb(215, 247, 225)
        - dark.value: rgb(0, 78, 47) -> rgb(0, 38, 29)
        - dark.uuid: df621308-02ad-49b0-9be3-10aa387bca77 -> e8f294f5-cb17-4fdc-b370-ca2e3f95d342
        - wireframe.value: rgb(237, 241, 250) -> rgb(235, 239, 248)
    - `green-300`
        - light.value: rgb(137, 236, 188) -> rgb(173, 238, 197)
        - dark.value: rgb(0, 92, 56) -> rgb(0, 51, 38)
        - dark.uuid: 14b4ff49-4ab1-48a6-aa1e-806c6cadaa62 -> cd5e0471-a8c0-46cd-b98c-be3a74c2b6d2
        - wireframe.value: rgb(233, 238, 248) -> rgb(216, 224, 242)
    - `green-400`
        - light.value: rgb(103, 222, 168) -> rgb(107, 227, 162)
        - dark.value: rgb(0, 108, 67) -> rgb(0, 68, 48)
        - dark.uuid: ae488b77-a511-4ef2-846c-55b336525eec -> c5e88879-9773-446c-883e-96531bcb8fad
        - wireframe.value: rgb(226, 232, 247) -> rgb(192, 205, 234)
    - `green-500`
        - light.value: rgb(73, 204, 147) -> rgb(43, 209, 125)
        - dark.value: rgb(0, 125, 78) -> rgb(2, 87, 58)
        - dark.uuid: 7be03fbf-6ce6-4707-8628-ec9ae3465f47 -> 27649ccc-69a8-48d6-9d52-6d6e2e28ae17
        - wireframe.value: rgb(216, 225, 244) -> rgb(164, 183, 225)
    - `green-600`
        - light.value: rgb(47, 184, 128) -> rgb(18, 184, 103)
        - dark.value: rgb(0, 143, 93) -> rgb(3, 106, 67)
        - dark.uuid: 7cdbd4d6-643d-49f2-9c00-aef6f6b98eef -> a0513e49-8483-40f8-8b8f-41fdc222f13d
        - wireframe.value: rgb(203, 215, 241) -> rgb(135, 160, 215)
    - `green-700`
        - light.value: rgb(21, 164, 110) -> rgb(11, 164, 93)
        - dark.value: rgb(18, 162, 108) -> rgb(4, 124, 75)
        - dark.uuid: 4c105995-9269-4655-9bbd-bb50f9cdca4a -> 9c24175e-34a5-46c8-b646-f70c08292776
        - wireframe.value: rgb(190, 205, 237) -> rgb(113, 142, 208)
    - `green-800`
        - light.value: rgb(0, 143, 93) -> rgb(7, 147, 85)
        - dark.value: rgb(43, 180, 125) -> rgb(6, 136, 80)
        - dark.uuid: 5471d254-44e5-4317-a6d6-eb24279c0b03 -> 412da16e-4db2-47d8-84d4-583ae35534f9
        - wireframe.value: rgb(173, 192, 233) -> rgb(93, 127, 201)
    - `green-900`
        - light.value: rgb(0, 122, 77) -> rgb(5, 131, 78)
        - dark.value: rgb(67, 199, 143) -> rgb(9, 157, 89)
        - dark.uuid: 21cb58fb-f173-4348-9b70-1b20683b7a65 -> 5afee2ee-a5d5-4dcf-a917-11dfdd0c3691
        - wireframe.value: rgb(154, 177, 227) -> rgb(74, 111, 195)
    - `green-1000`
        - light.value: rgb(0, 101, 62) -> rgb(3, 110, 69)
        - dark.value: rgb(94, 217, 162) -> rgb(14, 175, 98)
        - dark.uuid: d2fb208c-73f2-42c6-a27e-bd4f8832b25f -> 3d6732a1-a1f9-4e18-927b-93cebaae3895
        - wireframe.value: rgb(133, 161, 219) -> rgb(61, 94, 165)
    - `green-1100`
        - light.value: rgb(0, 81, 50) -> rgb(2, 93, 60)
        - dark.value: rgb(129, 233, 184) -> rgb(24, 193, 110)
        - dark.uuid: 4a310c88-9def-42fe-ad5e-1153d185a5fe -> a2f8f6c6-07b4-43a4-8f59-995ea2bf4e82
        - wireframe.value: rgb(114, 145, 211) -> rgb(52, 79, 140)
    - `green-1200`
        - light.value: rgb(5, 63, 39) -> rgb(1, 76, 52)
        - dark.value: rgb(177, 244, 209) -> rgb(57, 215, 134)
        - dark.uuid: 53ba43a9-2d41-4a55-9193-0d569e939993 -> 07fa1b72-bf84-4fd5-9565-28373fae6a1f
        - wireframe.value: rgb(96, 130, 201) -> rgb(42, 65, 114)
    - `green-1300`
        - light.value: rgb(10, 46, 29) -> rgb(0, 61, 44)
        - dark.value: rgb(223, 250, 234) -> rgb(126, 231, 172)
        - dark.uuid: 7a024876-6c60-4df1-863d-beda1d572bd6 -> c5ec27ed-3a16-44fe-bb8d-a21edd2f4d73
        - wireframe.value: rgb(82, 117, 192) -> rgb(34, 51, 91)
    - `green-1400`
        - light.value: rgb(10, 32, 21) -> rgb(0, 46, 34)
        - dark.value: rgb(254, 255, 252) -> rgb(189, 241, 208)
        - dark.uuid: b07f7383-d795-49e5-9dac-1d448d978624 -> df5458e5-891b-4a88-a96c-748a812978a7
        - wireframe.value: rgb(74, 109, 184) -> rgb(25, 39, 69)
    - `seafoam-100`
        - light.value: rgb(206, 247, 243) -> rgb(235, 251, 246)
        - dark.value: rgb(18, 65, 63) -> rgb(0, 30, 27)
        - dark.uuid: d668ef92-6475-40e4-9837-d607fbb6b1ef -> 080b56a3-6f95-422a-9f4b-d850966c4984
        - wireframe.value: rgb(242, 245, 251) -> rgb(246, 248, 252)
    - `seafoam-200`
        - light.value: rgb(170, 241, 234) -> rgb(211, 246, 234)
        - dark.value: rgb(14, 76, 73) -> rgb(0, 39, 35)
        - dark.uuid: 05f93ec8-51ce-40fc-8609-0f7b6237c68f -> 2876bdd7-af97-4cd6-89cc-bdb9c2110946
        - wireframe.value: rgb(237, 241, 250) -> rgb(235, 239, 248)
    - `seafoam-300`
        - light.value: rgb(140, 233, 226) -> rgb(169, 237, 216)
        - dark.value: rgb(4, 90, 87) -> rgb(0, 50, 44)
        - dark.uuid: 7a5a19a8-fb25-4771-9972-837db8c65e9d -> d90b7496-0f54-41ce-96eb-c973457661ae
        - wireframe.value: rgb(233, 238, 248) -> rgb(216, 224, 242)
    - `seafoam-400`
        - light.value: rgb(101, 218, 210) -> rgb(92, 225, 194)
        - dark.value: rgb(0, 105, 101) -> rgb(0, 67, 59)
        - dark.uuid: d98c80fb-6f43-46bb-ac9a-227cf134ca67 -> ec603c2c-b2b2-4769-a889-ba7c91a458eb
        - wireframe.value: rgb(226, 232, 247) -> rgb(192, 205, 234)
    - `seafoam-500`
        - light.value: rgb(63, 201, 193) -> rgb(16, 207, 169)
        - dark.value: rgb(0, 122, 117) -> rgb(2, 86, 75)
        - dark.uuid: a4a5e461-575d-4ae5-9b0b-985b6b8e70b1 -> c24b866c-5ac0-49de-857b-48c655fa9990
        - wireframe.value: rgb(216, 225, 244) -> rgb(164, 183, 225)
    - `seafoam-600`
        - light.value: rgb(15, 181, 174) -> rgb(13, 181, 149)
        - dark.value: rgb(0, 140, 135) -> rgb(4, 105, 89)
        - dark.uuid: dbc0b9aa-b312-43fd-b412-e2013caf91d7 -> 73b58f7e-008b-44ae-8969-19d981d444d6
        - wireframe.value: rgb(203, 215, 241) -> rgb(135, 160, 215)
    - `seafoam-700`
        - light.value: rgb(0, 161, 154) -> rgb(11, 162, 134)
        - dark.value: rgb(0, 158, 152) -> rgb(6, 122, 103)
        - dark.uuid: 3fd24914-a5c7-4d79-b73a-3dfb135dd75b -> 0b8528e6-ceea-47a5-9727-24e97d7bc138
        - wireframe.value: rgb(190, 205, 237) -> rgb(113, 142, 208)
    - `seafoam-800`
        - light.value: rgb(0, 140, 135) -> rgb(9, 144, 120)
        - dark.value: rgb(3, 178, 171) -> rgb(8, 134, 112)
        - dark.uuid: 49b5ed44-a22b-4565-a09f-1e7ebc1bc63e -> df8f47d4-5c3b-4ecb-b9fb-5d2dbd39d696
        - wireframe.value: rgb(173, 192, 233) -> rgb(93, 127, 201)
    - `seafoam-900`
        - light.value: rgb(0, 119, 114) -> rgb(7, 129, 109)
        - dark.value: rgb(54, 197, 189) -> rgb(10, 154, 128)
        - dark.uuid: 5bbc257f-e7b9-46eb-a591-dbe2ad1850b7 -> dca23a18-2b19-48bf-9894-2f0948f6c05e
        - wireframe.value: rgb(154, 177, 227) -> rgb(74, 111, 195)
    - `seafoam-1000`
        - light.value: rgb(0, 99, 95) -> rgb(5, 108, 92)
        - dark.value: rgb(93, 214, 207) -> rgb(12, 173, 142)
        - dark.uuid: e134295a-a409-4143-b656-98b6e9cb40bd -> c416b5c5-0506-419f-88ca-f722f12a9d86
        - wireframe.value: rgb(133, 161, 219) -> rgb(61, 94, 165)
    - `seafoam-1100`
        - light.value: rgb(12, 79, 76) -> rgb(3, 92, 80)
        - dark.value: rgb(132, 230, 223) -> rgb(14, 190, 156)
        - dark.uuid: 9f1e7783-21c4-4890-9f61-af5423aaec37 -> 4a853bfc-f1b0-4e39-8cd8-da0350c99cd5
        - wireframe.value: rgb(114, 145, 211) -> rgb(52, 79, 140)
    - `seafoam-1200`
        - light.value: rgb(18, 60, 58) -> rgb(1, 75, 67)
        - dark.value: rgb(176, 242, 236) -> rgb(29, 214, 176)
        - dark.uuid: 0f47e0b5-6612-4014-b074-e9a6817f9a37 -> 8e4c65b7-d819-4ffd-9398-71e9d294ba63
        - wireframe.value: rgb(96, 130, 201) -> rgb(42, 65, 114)
    - `seafoam-1300`
        - light.value: rgb(18, 44, 43) -> rgb(0, 60, 54)
        - dark.value: rgb(223, 249, 246) -> rgb(122, 229, 203)
        - dark.uuid: ec37ce56-739c-4f91-a36c-6e56480aa822 -> ef35ace8-870d-42e0-8ce6-2df61415431f
        - wireframe.value: rgb(82, 117, 192) -> rgb(34, 51, 91)
    - `seafoam-1400`
        - light.value: rgb(15, 31, 30) -> rgb(0, 46, 40)
        - dark.value: rgb(254, 255, 254) -> rgb(186, 241, 222)
        - dark.uuid: 06b4eb8e-ff63-4345-a37f-67d5f48edb1b -> 9499384b-336c-4a41-af05-645a92ae40d4
        - wireframe.value: rgb(74, 109, 184) -> rgb(25, 39, 69)
    - `cyan-100`
        - light.value: rgb(197, 248, 255) -> rgb(238, 250, 254)
        - dark.value: rgb(0, 61, 98) -> rgb(0, 29, 39)
        - dark.uuid: efe22abb-6616-4456-81a0-37ee1951aba1 -> 24a8bb5a-93c3-4dd1-9ea2-d48c11479fe7
        - wireframe.value: rgb(242, 245, 251) -> rgb(246, 248, 252)
    - `cyan-200`
        - light.value: rgb(164, 240, 255) -> rgb(217, 244, 253)
        - dark.value: rgb(0, 71, 111) -> rgb(0, 36, 49)
        - dark.uuid: 73ab4a44-d2ef-45e7-a810-6c067657ce40 -> 3445cf4b-2460-4692-acf2-71844d687da4
        - wireframe.value: rgb(237, 241, 250) -> rgb(235, 239, 248)
    - `cyan-300`
        - light.value: rgb(136, 231, 250) -> rgb(183, 231, 252)
        - dark.value: rgb(0, 85, 127) -> rgb(0, 48, 65)
        - dark.uuid: f9868f72-1d95-4040-a223-659f98ba702f -> e4bcf4fc-aaec-49a5-a2bb-6bb55e7fff47
        - wireframe.value: rgb(233, 238, 248) -> rgb(216, 224, 242)
    - `cyan-400`
        - light.value: rgb(96, 216, 243) -> rgb(138, 213, 255)
        - dark.value: rgb(0, 100, 145) -> rgb(0, 64, 88)
        - dark.uuid: f20b54ee-fabd-4b7a-8d96-78e355a77e96 -> 94a5bd53-d69a-4063-b630-1976230d4f2d
        - wireframe.value: rgb(226, 232, 247) -> rgb(192, 205, 234)
    - `cyan-500`
        - light.value: rgb(51, 197, 232) -> rgb(92, 192, 255)
        - dark.value: rgb(0, 116, 162) -> rgb(0, 82, 113)
        - dark.uuid: d300a6ab-8f25-4a0f-b861-6023fb33d38a -> 909baeef-fd2f-4550-89ea-fb7ac9ea2db5
        - wireframe.value: rgb(216, 225, 244) -> rgb(164, 183, 225)
    - `cyan-600`
        - light.value: rgb(18, 176, 218) -> rgb(48, 167, 254)
        - dark.value: rgb(0, 134, 180) -> rgb(3, 99, 140)
        - dark.uuid: bb07fb46-9ca3-4e0d-b004-97ec2bc4a5f0 -> d753ef33-bfc0-424b-a2ac-ea87ecbee590
        - wireframe.value: rgb(203, 215, 241) -> rgb(135, 160, 215)
    - `cyan-700`
        - light.value: rgb(1, 156, 200) -> rgb(29, 149, 231)
        - dark.value: rgb(0, 153, 198) -> rgb(8, 115, 168)
        - dark.uuid: 5f971006-82ff-4793-aa03-82c2e21bebf0 -> 3cb348d4-14a9-43da-84c4-068cf46c8c6f
        - wireframe.value: rgb(190, 205, 237) -> rgb(113, 142, 208)
    - `cyan-800`
        - light.value: rgb(0, 134, 180) -> rgb(18, 134, 205)
        - dark.value: rgb(14, 173, 215) -> rgb(13, 125, 186)
        - dark.uuid: d87d8d1d-570f-4c3a-8736-f71bcc265c44 -> ee8673ca-c39c-437e-b3a5-416f4e8664d3
        - wireframe.value: rgb(173, 192, 233) -> rgb(93, 127, 201)
    - `cyan-900`
        - light.value: rgb(0, 113, 159) -> rgb(11, 120, 179)
        - dark.value: rgb(44, 193, 230) -> rgb(24, 142, 220)
        - dark.uuid: 807d5e18-52ee-4b22-9bf3-b969c83e01ba -> 9c183829-4858-4908-b1ac-d89f40f2e903
        - wireframe.value: rgb(154, 177, 227) -> rgb(74, 111, 195)
    - `cyan-1000`
        - light.value: rgb(0, 93, 137) -> rgb(4, 102, 145)
        - dark.value: rgb(84, 211, 241) -> rgb(38, 159, 244)
        - dark.uuid: 162dd4e2-ce25-431c-9849-cb4ab0625c51 -> 04f3d463-9118-43d5-973d-8bf94417912d
        - wireframe.value: rgb(133, 161, 219) -> rgb(61, 94, 165)
    - `cyan-1100`
        - light.value: rgb(0, 74, 115) -> rgb(0, 87, 121)
        - dark.value: rgb(127, 228, 249) -> rgb(63, 177, 255)
        - dark.uuid: db93015d-b200-4437-8399-aec786c338db -> 62a7ebff-a49b-4e7a-981f-692a506b4146
        - wireframe.value: rgb(114, 145, 211) -> rgb(52, 79, 140)
    - `cyan-1200`
        - light.value: rgb(0, 57, 93) -> rgb(0, 71, 98)
        - dark.value: rgb(167, 241, 255) -> rgb(107, 199, 255)
        - dark.uuid: 3245ab92-850f-440d-bec6-1cdc34ab38b8 -> 36a2af99-eef4-476b-a3b8-58eade0931b7
        - wireframe.value: rgb(96, 130, 201) -> rgb(42, 65, 114)
    - `cyan-1300`
        - light.value: rgb(0, 42, 70) -> rgb(0, 57, 78)
        - dark.value: rgb(215, 250, 255) -> rgb(152, 219, 255)
        - dark.uuid: 3bdb98f7-2dad-4c35-96e4-b009cbc01180 -> 5f3df12b-1330-4482-ad34-c623bd36253c
        - wireframe.value: rgb(82, 117, 192) -> rgb(34, 51, 91)
    - `cyan-1400`
        - light.value: rgb(0, 30, 51) -> rgb(0, 43, 59)
        - dark.value: rgb(255, 255, 255) -> rgb(195, 236, 252)
        - dark.uuid: 5bd12e39-1386-49d5-af4f-d9f7dd1c549c -> fe63b8a3-ebb9-45fe-99c2-e246b53e06a6
        - wireframe.value: rgb(74, 109, 184) -> rgb(25, 39, 69)
    - `indigo-100`
        - light.value: rgb(237, 238, 255) -> rgb(247, 248, 255)
        - dark.value: rgb(40, 44, 140) -> rgb(30, 0, 93)
        - dark.uuid: 4a856cd1-643f-485c-991b-c94a750277dc -> e60cb247-c265-4009-9f0a-bcbbbb801dd4
        - wireframe.value: rgb(242, 245, 251) -> rgb(246, 248, 252)
    - `indigo-200`
        - light.value: rgb(224, 226, 255) -> rgb(235, 238, 255)
        - dark.value: rgb(47, 52, 163) -> rgb(35, 0, 110)
        - dark.uuid: 4d6f5e35-b3bd-4215-a135-f7b2b67447e0 -> 56c709dd-b41e-478a-8098-21014e3f9ec8
        - wireframe.value: rgb(237, 241, 250) -> rgb(235, 239, 248)
    - `indigo-300`
        - light.value: rgb(211, 213, 255) -> rgb(216, 222, 255)
        - dark.value: rgb(57, 63, 187) -> rgb(47, 0, 140)
        - dark.uuid: 6209d9c9-3639-4fdd-83de-904ca5ae5638 -> 716f244e-67c5-4566-b824-ed7f2192b585
        - wireframe.value: rgb(233, 238, 248) -> rgb(216, 224, 242)
    - `indigo-400`
        - light.value: rgb(193, 196, 255) -> rgb(192, 201, 255)
        - dark.value: rgb(70, 75, 211) -> rgb(62, 12, 174)
        - dark.uuid: 3d843f10-9396-43de-a855-a18b412b53fc -> c256e06e-07bc-4dcd-9239-48841916c93b
        - wireframe.value: rgb(226, 232, 247) -> rgb(192, 205, 234)
    - `indigo-500`
        - light.value: rgb(172, 175, 255) -> rgb(167, 178, 255)
        - dark.value: rgb(85, 91, 231) -> rgb(79, 30, 209)
        - dark.uuid: 1283a5f4-4a5d-4d59-a1ea-5bdd3e0396c5 -> 1ea0564b-6e88-456e-a796-4620d57b8771
        - wireframe.value: rgb(216, 225, 244) -> rgb(164, 183, 225)
    - `indigo-600`
        - light.value: rgb(149, 153, 255) -> rgb(145, 151, 254)
        - dark.value: rgb(104, 109, 244) -> rgb(95, 52, 235)
        - dark.uuid: c71827e0-5782-4b4f-b198-c6d7d4077249 -> df590853-ce16-4ddf-bbe9-a912695eae17
        - wireframe.value: rgb(203, 215, 241) -> rgb(135, 160, 215)
    - `indigo-700`
        - light.value: rgb(126, 132, 252) -> rgb(132, 128, 254)
        - dark.value: rgb(124, 129, 251) -> rgb(109, 75, 248)
        - dark.uuid: 5fc6c5cb-3072-46c6-a8b0-b88091835ff4 -> 0ea3a7e0-35c5-46ec-ae9d-500c5ee06a16
        - wireframe.value: rgb(190, 205, 237) -> rgb(113, 142, 208)
    - `indigo-800`
        - light.value: rgb(104, 109, 244) -> rgb(122, 106, 253)
        - dark.value: rgb(145, 149, 255) -> rgb(116, 91, 252)
        - dark.uuid: 9b272e22-81ba-4e31-a220-b79c4181c96f -> 97e84a30-1de4-4e84-8d59-e625f9ec9ab1
        - wireframe.value: rgb(173, 192, 233) -> rgb(93, 127, 201)
    - `indigo-900`
        - light.value: rgb(82, 88, 228) -> rgb(113, 85, 250)
        - dark.value: rgb(167, 170, 255) -> rgb(128, 119, 254)
        - dark.uuid: 3282c01c-7b68-4999-a12e-ee389a6f9ea1 -> 5cb7ff5e-ec53-4df8-b59d-a1419190a6cf
        - wireframe.value: rgb(154, 177, 227) -> rgb(74, 111, 195)
    - `indigo-1000`
        - light.value: rgb(64, 70, 202) -> rgb(99, 56, 238)
        - dark.value: rgb(188, 190, 255) -> rgb(139, 141, 254)
        - dark.uuid: 3fab75f4-9161-4040-88ca-0af98b1236fd -> 0bf6170c-50d7-4600-96fe-2d1af93f173a
        - wireframe.value: rgb(133, 161, 219) -> rgb(61, 94, 165)
    - `indigo-1100`
        - light.value: rgb(50, 54, 168) -> rgb(84, 36, 219)
        - dark.value: rgb(208, 210, 255) -> rgb(153, 161, 255)
        - dark.uuid: c537ba0b-c81a-40f3-8255-5be0491ca2a6 -> c85ea1d9-e28d-46c5-abd0-c053858770e0
        - wireframe.value: rgb(114, 145, 211) -> rgb(52, 79, 140)
    - `indigo-1200`
        - light.value: rgb(38, 41, 134) -> rgb(69, 19, 191)
        - dark.value: rgb(226, 228, 255) -> rgb(176, 186, 255)
        - dark.uuid: f9446b63-346f-4490-b975-929bdbb12655 -> 91f9622a-03b4-47b0-b380-5f6d64c13b5d
        - wireframe.value: rgb(96, 130, 201) -> rgb(42, 65, 114)
    - `indigo-1300`
        - light.value: rgb(27, 30, 100) -> rgb(55, 6, 160)
        - dark.value: rgb(243, 243, 254) -> rgb(199, 208, 255)
        - dark.uuid: 11e00286-b34f-44c7-ba95-ab2e07990106 -> c0bfd081-7859-4ed5-aa4c-c1f547dab8f3
        - wireframe.value: rgb(82, 117, 192) -> rgb(34, 51, 91)
    - `indigo-1400`
        - light.value: rgb(20, 22, 72) -> rgb(42, 0, 129)
        - dark.value: rgb(255, 255, 255) -> rgb(223, 228, 255)
        - dark.uuid: ee07f360-a89e-49e6-baf5-462b84133aed -> 080f9ea4-1d87-4691-adb7-3875a7708555
        - wireframe.value: rgb(74, 109, 184) -> rgb(25, 39, 69)
    - `purple-100`
        - light.value: rgb(246, 235, 255) -> rgb(251, 247, 254)
        - dark.value: rgb(76, 13, 157) -> rgb(41, 0, 79)
        - dark.uuid: 1d180da0-3c21-488e-b017-728194ed8578 -> ffc5aa7a-c339-4583-a586-3e8b1329d16d
        - wireframe.value: rgb(242, 245, 251) -> rgb(246, 248, 252)
    - `purple-200`
        - light.value: rgb(238, 221, 255) -> rgb(244, 235, 252)
        - dark.value: rgb(89, 17, 177) -> rgb(50, 0, 96)
        - dark.uuid: bad41b06-2848-4eb0-a3a0-6c2b90da8630 -> 2d67627b-372c-46af-b015-6c95bd027664
        - wireframe.value: rgb(237, 241, 250) -> rgb(235, 239, 248)
    - `purple-300`
        - light.value: rgb(230, 208, 255) -> rgb(235, 218, 249)
        - dark.value: rgb(105, 28, 200) -> rgb(64, 0, 122)
        - dark.uuid: 22929eab-9a55-48b1-9798-d04d9bbea6cf -> be628028-f41d-4ace-abf3-f7f38ecb2e01
        - wireframe.value: rgb(233, 238, 248) -> rgb(216, 224, 242)
    - `purple-400`
        - light.value: rgb(219, 187, 254) -> rgb(221, 193, 246)
        - dark.value: rgb(122, 45, 218) -> rgb(83, 0, 159)
        - dark.uuid: d2c6a538-52af-4dc0-8318-b35453ffe8c4 -> 474fed30-921a-4795-8999-2310521c64c5
        - wireframe.value: rgb(226, 232, 247) -> rgb(192, 205, 234)
    - `purple-500`
        - light.value: rgb(204, 164, 253) -> rgb(208, 167, 243)
        - dark.value: rgb(140, 65, 233) -> rgb(107, 6, 195)
        - dark.uuid: 3a969a81-eefb-468b-8889-1ad5b47c361f -> b912e8ba-ed77-4179-9b80-7448f9e37193
        - wireframe.value: rgb(216, 225, 244) -> rgb(164, 183, 225)
    - `purple-600`
        - light.value: rgb(189, 139, 252) -> rgb(191, 138, 238)
        - dark.value: rgb(157, 87, 243) -> rgb(130, 34, 215)
        - dark.uuid: 694dda5b-71ac-4169-b71e-65fe62650098 -> 05638159-aaf7-4f3e-849e-a46e80cd9ee6
        - wireframe.value: rgb(203, 215, 241) -> rgb(135, 160, 215)
    - `purple-700`
        - light.value: rgb(174, 114, 249) -> rgb(178, 114, 235)
        - dark.value: rgb(172, 111, 249) -> rgb(148, 62, 224)
        - dark.uuid: 84640df4-6e8f-4e2c-893c-187875bf8e2c -> fb186f5e-72a8-4a27-8ba2-d2fdf53d5a5c
        - wireframe.value: rgb(190, 205, 237) -> rgb(113, 142, 208)
    - `purple-800`
        - light.value: rgb(157, 87, 244) -> rgb(166, 92, 231)
        - dark.value: rgb(187, 135, 251) -> rgb(157, 78, 228)
        - dark.uuid: 421e2e18-233d-40d8-81ed-b777d7b4539b -> 30aae683-83e3-47a1-bdcb-ebe658e110a3
        - wireframe.value: rgb(173, 192, 233) -> rgb(93, 127, 201)
    - `purple-900`
        - light.value: rgb(137, 61, 231) -> rgb(154, 71, 226)
        - dark.value: rgb(202, 159, 252) -> rgb(173, 105, 233)
        - dark.uuid: c767aaa3-0818-4404-a921-94f924159b8f -> 12d86845-fd54-4d30-aac8-bb9451560ba5
        - wireframe.value: rgb(154, 177, 227) -> rgb(74, 111, 195)
    - `purple-1000`
        - light.value: rgb(115, 38, 211) -> rgb(134, 40, 217)
        - dark.value: rgb(215, 182, 254) -> rgb(186, 127, 237)
        - dark.uuid: 8c16ea42-3e31-41e3-9492-73f1a554079c -> e527a3bd-3543-4b40-8a9c-eb465695bdb9
        - wireframe.value: rgb(133, 161, 219) -> rgb(61, 94, 165)
    - `purple-1100`
        - light.value: rgb(93, 19, 183) -> rgb(115, 13, 204)
        - dark.value: rgb(228, 204, 254) -> rgb(197, 149, 240)
        - dark.uuid: b45da3d4-6b07-451e-8960-ac7bca1e4da2 -> 18265c0a-e466-4575-a364-3dfda9e71bd4
        - wireframe.value: rgb(114, 145, 211) -> rgb(52, 79, 140)
    - `purple-1200`
        - light.value: rgb(71, 12, 148) -> rgb(93, 0, 177)
        - dark.value: rgb(239, 223, 255) -> rgb(212, 176, 244)
        - dark.uuid: 5bac1ada-9c00-4243-af3a-bc3727745035 -> ae071768-dcdd-4e30-8f72-d066abac97af
        - wireframe.value: rgb(96, 130, 201) -> rgb(42, 65, 114)
    - `purple-1300`
        - light.value: rgb(51, 16, 106) -> rgb(75, 0, 144)
        - dark.value: rgb(249, 240, 255) -> rgb(225, 201, 247)
        - dark.uuid: 5e3bbc6d-1489-48ca-b5a1-423288727b1d -> fbaaff02-da93-4f45-830a-5fc449a58f0b
        - wireframe.value: rgb(82, 117, 192) -> rgb(34, 51, 91)
    - `purple-1400`
        - light.value: rgb(35, 15, 73) -> rgb(59, 0, 111)
        - dark.value: rgb(255, 253, 255) -> rgb(238, 224, 250)
        - dark.uuid: ae3f64d4-ed66-4d97-b7e5-65ee395f7883 -> 9ae063c9-5817-45b4-9f57-4b2196c845b9
        - wireframe.value: rgb(74, 109, 184) -> rgb(25, 39, 69)
    - `fuchsia-100`
        - light.value: rgb(255, 233, 252) -> rgb(254, 246, 255)
        - dark.value: rgb(107, 3, 106) -> rgb(50, 0, 61)
        - dark.uuid: fcf73bd6-3852-429a-9095-14524c2efea3 -> 3a434405-c4b0-40ef-b383-7cb9a9b60cab
        - wireframe.value: rgb(242, 245, 251) -> rgb(246, 248, 252)
    - `fuchsia-200`
        - light.value: rgb(255, 218, 250) -> rgb(253, 233, 255)
        - dark.value: rgb(123, 0, 123) -> rgb(61, 0, 74)
        - dark.uuid: 57ce4570-03d7-45a8-8f6c-85a2994fb067 -> 779ec441-475d-41de-b207-3e139c7c3168
        - wireframe.value: rgb(237, 241, 250) -> rgb(235, 239, 248)
    - `fuchsia-300`
        - light.value: rgb(254, 199, 248) -> rgb(250, 211, 255)
        - dark.value: rgb(144, 0, 145) -> rgb(79, 0, 95)
        - dark.uuid: a297d901-18ab-4da0-a5fa-d9749e8ea9db -> 5fa7110f-0c33-4139-8277-eff40921939e
        - wireframe.value: rgb(233, 238, 248) -> rgb(216, 224, 242)
    - `fuchsia-400`
        - light.value: rgb(251, 174, 246) -> rgb(247, 181, 255)
        - dark.value: rgb(165, 13, 166) -> rgb(102, 9, 120)
        - dark.uuid: 7eb42bf3-0008-4e2c-a085-0c0b0a56deba -> a81bfdd6-4b80-4f1a-922d-2f6e04c27e01
        - wireframe.value: rgb(226, 232, 247) -> rgb(192, 205, 234)
    - `fuchsia-500`
        - light.value: rgb(245, 146, 243) -> rgb(243, 147, 255)
        - dark.value: rgb(185, 37, 185) -> rgb(127, 23, 146)
        - dark.uuid: 5a5a7aac-7494-40d2-93c8-66e828c2397e -> 7ecdb8fa-7c4b-4392-bca8-a00a9b931cb4
        - wireframe.value: rgb(216, 225, 244) -> rgb(164, 183, 225)
    - `fuchsia-600`
        - light.value: rgb(237, 116, 237) -> rgb(236, 105, 255)
        - dark.value: rgb(205, 57, 206) -> rgb(151, 38, 170)
        - dark.uuid: 90ef0274-fb46-469e-a8d4-030b88dfe969 -> 0fb76488-9965-4cf9-878f-ceed7fc2be43
        - wireframe.value: rgb(203, 215, 241) -> rgb(135, 160, 215)
    - `fuchsia-700`
        - light.value: rgb(224, 85, 226) -> rgb(223, 77, 245)
        - dark.value: rgb(223, 81, 224) -> rgb(173, 51, 192)
        - dark.uuid: 3cebbadd-c690-493d-a36e-fc55d99d4b4b -> 5f971453-aa30-4c1f-8cbc-be45ff042fcd
        - wireframe.value: rgb(190, 205, 237) -> rgb(113, 142, 208)
    - `fuchsia-800`
        - light.value: rgb(205, 58, 206) -> rgb(200, 68, 220)
        - dark.value: rgb(235, 110, 236) -> rgb(186, 60, 206)
        - dark.uuid: 163fa258-c7a0-433a-bf26-875d55e2ba70 -> 5848fed6-5b42-42ef-9800-8f32e42cf6ba
        - wireframe.value: rgb(173, 192, 233) -> rgb(93, 127, 201)
    - `fuchsia-900`
        - light.value: rgb(182, 34, 183) -> rgb(181, 57, 200)
        - dark.value: rgb(244, 140, 242) -> rgb(213, 73, 235)
        - dark.uuid: d0d6c85c-233c-4394-b6a3-ac326b70992f -> 3c6d42c9-4cba-4373-a61c-c8617c509f92
        - wireframe.value: rgb(154, 177, 227) -> rgb(74, 111, 195)
    - `fuchsia-1000`
        - light.value: rgb(157, 3, 158) -> rgb(156, 40, 175)
        - dark.value: rgb(250, 168, 245) -> rgb(232, 91, 253)
        - dark.uuid: 31064db2-1b72-47c3-909d-339589204458 -> a13d5f15-e4cc-4f7c-928f-aaccbf0d590e
        - wireframe.value: rgb(133, 161, 219) -> rgb(61, 94, 165)
    - `fuchsia-1100`
        - light.value: rgb(128, 0, 129) -> rgb(135, 27, 154)
        - dark.value: rgb(254, 194, 248) -> rgb(240, 122, 255)
        - dark.uuid: 135ce68a-832c-4903-b1e3-39b0c2e4f10b -> 0a4eb3af-d067-4d9f-af91-66c676e49e26
        - wireframe.value: rgb(114, 145, 211) -> rgb(52, 79, 140)
    - `fuchsia-1200`
        - light.value: rgb(100, 6, 100) -> rgb(113, 15, 131)
        - dark.value: rgb(255, 219, 250) -> rgb(245, 159, 255)
        - dark.uuid: 6c569c3e-48fe-4bde-8521-7b63d8c4a37d -> 0d93ff9f-63e8-4caf-9e7b-714e56d968d4
        - wireframe.value: rgb(96, 130, 201) -> rgb(42, 65, 114)
    - `fuchsia-1300`
        - light.value: rgb(71, 14, 70) -> rgb(92, 4, 109)
        - dark.value: rgb(255, 239, 252) -> rgb(248, 191, 255)
        - dark.uuid: 712ba0be-7bd6-42d1-a1db-ba4aebb7eb28 -> abd44b32-b837-4e11-95c7-4ba1c34db44b
        - wireframe.value: rgb(82, 117, 192) -> rgb(34, 51, 91)
    - `fuchsia-1400`
        - light.value: rgb(50, 13, 49) -> rgb(72, 0, 88)
        - dark.value: rgb(255, 253, 255) -> rgb(251, 219, 255)
        - dark.uuid: 9b3a54f9-d94b-4a21-9145-5891d0cf1405 -> 7c819391-d74c-4326-ae0d-fe3534eb44e3
        - wireframe.value: rgb(74, 109, 184) -> rgb(25, 39, 69)
    - `magenta-100`
        - light.value: rgb(255, 234, 241) -> rgb(255, 245, 248)
        - dark.value: rgb(118, 0, 58) -> rgb(59, 0, 22)
        - dark.uuid: c49f033b-6e6f-4945-b199-af3ad874e8ea -> 9149371a-1978-4136-a89c-8895edd35e7d
        - wireframe.value: rgb(242, 245, 251) -> rgb(246, 248, 252)
    - `magenta-200`
        - light.value: rgb(255, 220, 232) -> rgb(255, 232, 240)
        - dark.value: rgb(137, 0, 66) -> rgb(74, 0, 27)
        - dark.uuid: 28ea9b3a-7802-4f3e-a576-9ca1e217a7e4 -> f5ffc5b3-d3e6-4d7e-b8a8-850324b5d9b8
        - wireframe.value: rgb(237, 241, 250) -> rgb(235, 239, 248)
    - `magenta-300`
        - light.value: rgb(255, 202, 221) -> rgb(255, 213, 227)
        - dark.value: rgb(160, 0, 77) -> rgb(93, 0, 34)
        - dark.uuid: 8a21b266-6888-4f68-9f44-7026634d6bdf -> 673ab9b4-e296-4472-b0b5-15adf9f1f762
        - wireframe.value: rgb(233, 238, 248) -> rgb(216, 224, 242)
    - `magenta-400`
        - light.value: rgb(255, 178, 206) -> rgb(255, 185, 208)
        - dark.value: rgb(182, 18, 90) -> rgb(123, 0, 45)
        - dark.uuid: d0319094-27f1-4634-b436-07f1a0ade2ab -> 60560de2-28e6-44b4-bcff-f357fe13a4a7
        - wireframe.value: rgb(226, 232, 247) -> rgb(192, 205, 234)
    - `magenta-500`
        - light.value: rgb(255, 149, 189) -> rgb(255, 152, 187)
        - dark.value: rgb(203, 38, 109) -> rgb(152, 7, 60)
        - dark.uuid: 60a7cd2d-5c88-4fbe-8180-6840d52678fc -> 830123a6-0e42-4c4f-9b20-2f4204d37af8
        - wireframe.value: rgb(216, 225, 244) -> rgb(164, 183, 225)
    - `magenta-600`
        - light.value: rgb(250, 119, 170) -> rgb(255, 112, 159)
        - dark.value: rgb(222, 61, 130) -> rgb(181, 19, 76)
        - dark.uuid: f7dd5e8b-4c41-4385-8d96-a984b62051be -> e6b14a1d-e26e-41c4-b386-7fb3f95b8c93
        - wireframe.value: rgb(203, 215, 241) -> rgb(135, 160, 215)
    - `magenta-700`
        - light.value: rgb(239, 90, 152) -> rgb(255, 72, 133)
        - dark.value: rgb(237, 87, 149) -> rgb(207, 31, 92)
        - dark.uuid: 3f07950a-4823-4826-9d78-d7b450c9e961 -> 11055a6b-7e81-4b59-9feb-8b0b6352be07
        - wireframe.value: rgb(190, 205, 237) -> rgb(113, 142, 208)
    - `magenta-800`
        - light.value: rgb(222, 61, 130) -> rgb(240, 45, 110)
        - dark.value: rgb(249, 114, 167) -> rgb(224, 38, 101)
        - dark.uuid: 7903bf4c-e957-4e84-b0c0-276c80e9a4d9 -> 6676db79-7b7e-4fcf-868b-321f9372517a
        - wireframe.value: rgb(173, 192, 233) -> rgb(93, 127, 201)
    - `magenta-900`
        - light.value: rgb(200, 34, 105) -> rgb(217, 35, 97)
        - dark.value: rgb(255, 143, 185) -> rgb(255, 51, 119)
        - dark.uuid: f316b3d8-5763-4166-94fe-664f477dd76f -> fa5e523e-7ee3-46d0-971f-4ee95c7222b8
        - wireframe.value: rgb(154, 177, 227) -> rgb(74, 111, 195)
    - `magenta-1000`
        - light.value: rgb(173, 9, 85) -> rgb(186, 22, 80)
        - dark.value: rgb(255, 172, 202) -> rgb(255, 96, 149)
        - dark.uuid: 6eeb3d6f-9eab-459c-b34c-e25c9ea107a4 -> bdabbfb5-1ae6-44a7-bc2e-55e11f4e5154
        - wireframe.value: rgb(133, 161, 219) -> rgb(61, 94, 165)
    - `magenta-1100`
        - light.value: rgb(142, 0, 69) -> rgb(163, 5, 62)
        - dark.value: rgb(255, 198, 218) -> rgb(255, 128, 171)
        - dark.uuid: 36c81f83-2299-4569-b133-4300d49fa3c2 -> 548a74eb-4401-44f4-85b4-921287d84ac9
        - wireframe.value: rgb(114, 145, 211) -> rgb(52, 79, 140)
    - `magenta-1200`
        - light.value: rgb(112, 0, 55) -> rgb(136, 0, 51)
        - dark.value: rgb(255, 221, 233) -> rgb(255, 163, 194)
        - dark.uuid: 72e2e0cb-7512-4e3b-8ac6-42a63a746e2b -> 9c634688-1ad5-438b-bd44-a92c64ef9934
        - wireframe.value: rgb(96, 130, 201) -> rgb(42, 65, 114)
    - `magenta-1300`
        - light.value: rgb(84, 3, 42) -> rgb(111, 0, 40)
        - dark.value: rgb(255, 240, 245) -> rgb(255, 193, 214)
        - dark.uuid: b1caf781-77c9-48eb-84a5-507d84b6cdf4 -> 6c441ca7-0294-462f-ac18-7b28ff20d7ff
        - wireframe.value: rgb(82, 117, 192) -> rgb(34, 51, 91)
    - `magenta-1400`
        - light.value: rgb(60, 6, 29) -> rgb(86, 0, 30)
        - dark.value: rgb(255, 252, 253) -> rgb(255, 220, 232)
        - dark.uuid: 2dcf8d47-a293-4ed2-bac5-2f935ed7ca5b -> 15f36ded-01af-4c5d-8b11-45523e7d908e
        - wireframe.value: rgb(74, 109, 184) -> rgb(25, 39, 69)
    - `static-blue-900`
        - uuid: a77887aa-da75-41bd-8bc1-43e41ab5132f -> e193b8bb-6a0b-4c23-9851-83634f3797f8
    - `static-blue-1000`
        - uuid: fe65be29-fd3b-4712-84c9-d8ef84a94a53 -> 8402b6ad-f3da-4ea2-8b55-174a9794950d
    - `static-fuchsia-900`
        - uuid: 6d329081-9b84-47d5-a7ec-e01726a22c3c -> 7629af9c-2f91-449e-a82f-c60a771b0e6f
    - `static-fuchsia-1000`
        - uuid: b7318f1c-ce64-43f3-b405-f71554b22f69 -> 0aee9ad6-2d79-4479-bdb6-aafa07a98673
    - `static-indigo-900`
        - uuid: b458f7a4-eb22-4741-9a5a-f65c9f4a4e63 -> 970ddf30-3683-4f48-9ac7-8a9e42902fd3
    - `static-indigo-1000`
        - uuid: c938f37b-23a3-424a-b6de-9fe3289e9b46 -> fb3003ec-6793-47b0-947d-a89e642652fc
    - `static-magenta-900`
        - uuid: dff48efb-7044-427f-94ad-625e1a5780ab -> 5b34bb1d-a23e-4799-ad59-8fa8f51d3726
    - `static-magenta-1000`
        - uuid: a8375133-a8ba-4537-83ab-83b6948adcd8 -> 058a8ff9-740d-4e11-bdb6-7473a77f872b
    - `static-red-900`
        - uuid: f76d5058-5a46-4678-b467-2f7cb1b97297 -> d31011ef-7270-4c83-802d-05701ae9a3c8
    - `static-red-1000`
        - uuid: c6d6fd48-385e-4e39-98e7-e4d7d7f060ed -> 3a65213c-4d36-48ec-8bf9-1b163a81299d
    - `swatch-border-color`
        - value: gray-900 -> gray-1000
    - `swatch-border-opacity`
        - value: 0.51 -> 0.42
    - `swatch-disabled-icon-border-opacity`
        - value: 0.51 -> 0.42
    - `opacity-checkerboard-square-dark`
        - dark.uuid: 5dbb3e96-fe86-43a2-be8b-3ceecfe2d5ba -> f783b8cb-d31f-46c2-b550-990639752510
    - `color-area-border-color`
        - value: gray-900 -> gray-1000
    - `color-slider-border-color`
        - value: gray-900 -> gray-1000
    - `color-loupe-drop-shadow-color`
        - value: transparent-black-300 -> drop-shadow-elevated-color
    - `color-loupe-drop-shadow-y`
        - schema: dimension.json -> alias.json
        - value: 2px -> drop-shadow-elevated-y
    - `color-loupe-drop-shadow-blur`
        - schema: dimension.json -> alias.json
        - value: 8px -> drop-shadow-elevated-blur
    - `card-selection-background-color`
        - component: cards -> card
    - `card-selection-background-color-opacity`
        - component: cards -> card
    - `overlay-opacity`
        - dark.value: 0.5 -> 0.6
        - dark.uuid: df41eb51-872f-458d-9439-910064f74b7b -> 31d5b502-6266-4309-8f8a-3892e6e158da
    - `drop-shadow-color`
        - schema: color-set.json -> alias.json
        - uuid: 4467906f-b4e1-48d9-bd5f-cfec4052c47d -> be45ace6-9227-41d1-80be-0c58c3f8b3cb
    - `background-base-color`
        - schema: color-set.json -> alias.json
        - uuid: 44807783-e21a-42a9-b880-2cebdaa11e0c -> e0d8739d-18dd-44bc-92ea-e443882a780b
    - `background-layer-1-color`
        - schema: color-set.json -> alias.json
        - uuid: b3e813b0-a76f-42b8-98f2-3c8a4090a4c5 -> 7e6678b7-2903-434b-8ee2-06c83815b01d
    - `background-layer-2-color`
        - light.value: gray-50 -> gray-25
        - dark.value: gray-100 -> gray-75
        - dark.uuid: dd462fc7-bd79-4b52-9411-adf317832989 -> e30b7936-6ae7-4ada-8892-94a1f67d55c9
    - `neutral-background-color-default`
        - schema: color-set.json -> alias.json
        - uuid: 0c809329-bfc8-4802-a5f8-feecc0ce6018 -> 95cf1481-f476-47ce-a45a-54da64b44255
    - `neutral-background-color-hover`
        - schema: color-set.json -> alias.json
        - uuid: 68fad5b1-bbbe-4337-b98e-bb9b605ea006 -> 142f9467-e519-4ed7-bd98-69a31e876e70
    - `neutral-background-color-down`
        - schema: color-set.json -> alias.json
        - uuid: b25017fb-d8a3-4e90-9f6d-2e1bebdffb10 -> 5a0fdda5-6ac2-4a31-a7b9-6b3a5dd868d6
    - `neutral-background-color-key-focus`
        - schema: color-set.json -> alias.json
        - uuid: ddbc3e84-ae77-435b-93e6-da50c7a949e0 -> f52c6bfb-2d62-4fc8-a1cd-6c8d7420eeb4
    - `neutral-background-color-selected-default`
        - schema: system-set.json -> alias.json
        - uuid: 1cd150bf-e900-4581-8952-dcf3e37c5b0a -> fd1c9f2b-8358-4bd3-a5cc-d211673428bc
    - `neutral-background-color-selected-hover`
        - schema: system-set.json -> alias.json
        - uuid: 48b07514-10c0-49ee-a383-11cc2eceb866 -> 1c220122-5f32-42f9-848f-ae10061241e5
    - `neutral-background-color-selected-down`
        - schema: system-set.json -> alias.json
        - uuid: 98605fb3-1905-4309-95b9-bdd53e08b341 -> 966c56d0-4461-45e7-9e20-0277f2111a34
    - `neutral-background-color-selected-key-focus`
        - schema: system-set.json -> alias.json
        - uuid: d94c6eec-4f22-45e5-a5b3-f91773b99358 -> 9b8df7df-3439-4614-b446-97a4de782e27
    - `neutral-subdued-background-color-default`
        - light.value: gray-600 -> gray-700
        - dark.value: gray-400 -> gray-500
        - dark.uuid: ccb9da64-89e5-4e9b-b868-1ac9e1d1f183 -> bc9979cb-e7c6-45b2-be4d-0ba3c817e2ef
    - `neutral-subdued-background-color-hover`
        - light.value: gray-700 -> gray-800
        - dark.value: gray-300 -> gray-400
        - dark.uuid: 338e2fda-0da2-4a52-b718-ca0ca50e88f9 -> 2d72c9fc-22d0-4e4d-9b00-fae4b30a47b5
    - `neutral-subdued-background-color-down`
        - dark.value: gray-200 -> gray-400
        - dark.uuid: 6098f9a7-595e-488f-b44c-2b51a8924f90 -> 11bf9149-d8df-4f37-ba21-51ff911b0517
    - `neutral-subdued-background-color-key-focus`
        - light.value: gray-700 -> gray-800
        - dark.value: gray-300 -> gray-400
        - dark.uuid: 8f3f4b30-3887-4368-a38b-ec274eb99aa0 -> a1e08db6-3a72-4b8e-9475-b54a7b9be506
    - `accent-background-color-default`
        - dark.value: accent-color-500 -> accent-color-800
        - dark.uuid: 94a5cedd-01d3-44c8-b741-01f3b70a5e90 -> f24eb871-6419-4cef-88a2-cca8548ae31e
    - `accent-background-color-hover`
        - dark.value: accent-color-400 -> accent-color-700
        - dark.uuid: 7c891ae9-00a1-4b9f-8a77-d582a9d2addb -> 9e140a94-c11f-470b-b7af-49880e58d4ce
    - `accent-background-color-down`
        - light.value: accent-color-1100 -> accent-color-1000
        - dark.value: accent-color-300 -> accent-color-700
        - dark.uuid: d2101964-8d67-44a1-9f94-623caf51ad1d -> e2c0de7e-d271-4b2c-9393-d864a95732e6
    - `accent-background-color-key-focus`
        - dark.value: accent-color-400 -> accent-color-700
        - dark.uuid: 46be0da3-d704-4d26-929e-4507a813d615 -> af809118-7a97-409c-925f-8d7636a791c8
    - `informative-background-color-default`
        - dark.value: informative-color-500 -> informative-color-800
        - dark.uuid: 8676a0d3-13df-4994-8614-94fa72c89486 -> da3a7c08-7f54-4486-bb66-146db21f0627
    - `informative-background-color-hover`
        - dark.value: informative-color-400 -> informative-color-700
        - dark.uuid: 5f53230c-36b0-46da-993c-3d707a4e148a -> 092415a8-0054-4f6d-9a93-1541c767b2c5
    - `informative-background-color-down`
        - light.value: informative-color-1100 -> informative-color-1000
        - dark.value: informative-color-300 -> informative-color-700
        - dark.uuid: 28a819c5-6d64-4bad-a6c9-7b7c250dc46e -> c9c09cc9-1ebd-4738-9613-6a0a67bea4f9
    - `informative-background-color-key-focus`
        - dark.value: informative-color-400 -> informative-color-700
        - dark.uuid: 527b21ef-5b24-4c16-8b99-f2bdd3b8f2f8 -> e5292c94-ea4a-49ba-8c25-6ab1114e0fe3
    - `negative-background-color-default`
        - dark.value: negative-color-500 -> negative-color-800
        - dark.uuid: 5e18e40b-8db1-45ba-ac1c-4a54d5b7270a -> 1117b73b-42e3-4ad6-8b26-af76859a27bb
    - `negative-background-color-hover`
        - dark.value: negative-color-400 -> negative-color-700
        - dark.uuid: 94b551c9-a0ea-48f1-8ab3-c3168a1f511d -> 648da867-549e-47c3-9312-e9cfda288705
    - `negative-background-color-down`
        - light.value: negative-color-1100 -> negative-color-1000
        - dark.value: negative-color-300 -> negative-color-700
        - dark.uuid: fc862942-7fbb-411b-8857-d8a7ae226633 -> 8565ec8e-2196-47ac-8636-40084acbfd4f
    - `negative-background-color-key-focus`
        - dark.value: negative-color-400 -> negative-color-700
        - dark.uuid: 6382df57-549e-40b4-b378-3921bba6b850 -> f1470931-f4f8-47d9-b118-5b813e4c154a
    - `positive-background-color-default`
        - dark.value: positive-color-500 -> positive-color-800
        - dark.uuid: 2fc671b6-0dde-416e-ae7e-a67c30d4a800 -> 82b54f71-7c9e-4388-9e3b-4d13f12fad60
    - `positive-background-color-hover`
        - dark.value: positive-color-400 -> positive-color-700
        - dark.uuid: 596bfca6-ab01-421f-8fc1-b61ebef37ded -> 2992a78b-9ce0-4b29-a4f6-ddbc51f820f2
    - `positive-background-color-down`
        - light.value: positive-color-1100 -> positive-color-1000
        - dark.value: positive-color-300 -> positive-color-700
        - dark.uuid: 2e7048e0-a74e-4e40-b739-053cf298f4e2 -> 58a934d2-a715-4544-aa79-7f94bd493f09
    - `positive-background-color-key-focus`
        - dark.value: positive-color-400 -> positive-color-700
        - dark.uuid: 3ac208d1-7fac-4692-ada9-1a19f4896a81 -> 56d371b4-437f-4ca9-854f-ae6daf5dcfce
    - `notice-background-color-default`
        - dark.value: notice-color-800 -> notice-color-900
        - dark.uuid: 48df522d-8857-42d3-a2b3-e86828a39cfd -> 323428c1-792d-41b4-8a17-a12f1ac00e2a
        - light.uuid: 87666730-0d8e-434d-9bfb-0a45e729c482 -> 48f3445a-63d8-4477-a2f5-1fee6a022328
        - wireframe.uuid: 640e857c-c62c-4289-b83a-1e36cee90ad4 -> 0fdc01c4-459a-4f74-a8e0-fdbe93f8138f
    - `disabled-background-color`
        - value: gray-200 -> gray-100
    - `disabled-static-white-background-color`
        - value: transparent-white-200 -> transparent-white-100
    - `disabled-static-black-background-color`
        - value: transparent-black-200 -> transparent-black-100
    - `gray-background-color-default`
        - dark.value: gray-700 -> gray-500
        - dark.uuid: fe9180f1-54db-4ec3-82c6-f6b084dd24f7 -> a3e71134-b44f-4b52-a84d-4841e01505e6
        - wireframe.value: gray-600 -> gray-700
        - wireframe.uuid: 6a74ab0a-e481-4d38-9db7-ea8ef885940b -> c41bb795-182e-45c0-afea-4ae2148e37a4
    - `red-background-color-default`
        - dark.value: red-700 -> red-800
        - dark.uuid: 3da4e1a0-7a02-4488-92d8-744b2f3e5cbc -> ce074ee2-a2a2-4da3-a99e-603524193d46
    - `orange-background-color-default`
        - dark.value: orange-800 -> orange-900
        - dark.uuid: 706d7352-dd31-42c1-91d4-b9407ee49868 -> 3e9a6c2a-bd09-4d28-a95c-920109c1852f
    - `yellow-background-color-default`
        - dark.value: yellow-1000 -> yellow-1100
        - dark.uuid: 5fd7e36b-05df-4384-a3f1-a3d8b9330823 -> 61c5e375-bff3-479f-8c32-2d2a5edb906c
    - `chartreuse-background-color-default`
        - dark.value: chartreuse-900 -> chartreuse-1000
        - dark.uuid: 8c8db46e-af99-4057-85ea-3f05055b97cc -> 5df9a029-dc91-4078-a198-574486948834
    - `celery-background-color-default`
        - dark.value: celery-800 -> celery-900
        - dark.uuid: 87f5b73a-19b1-40f7-991b-0d4b6bfc4a99 -> a9ab7a59-9cab-47fb-876d-6f0af93dc5df
    - `green-background-color-default`
        - dark.value: green-700 -> green-800
        - dark.uuid: fbe68215-410b-4f50-82f1-365754366275 -> 49170573-9c22-42e1-a1ce-cd3d3972ddb7
    - `seafoam-background-color-default`
        - dark.value: seafoam-700 -> seafoam-800
        - dark.uuid: d49fb92d-b0ea-44c6-a17b-817da00361f9 -> 9a727140-328d-430f-9b10-8965eebe77d1
    - `cyan-background-color-default`
        - dark.value: cyan-700 -> cyan-800
        - dark.uuid: 4dda3368-def2-4cd6-ae04-1483bb129ca5 -> 543af64f-9c28-4e88-8597-3259cd7ebf1f
    - `blue-background-color-default`
        - dark.value: blue-700 -> blue-800
        - dark.uuid: 04d7615b-5006-4857-9a66-38a3955516f8 -> 83591a94-83e1-4557-8f50-cc1fe9793b76
    - `indigo-background-color-default`
        - dark.value: indigo-700 -> indigo-800
        - dark.uuid: 40af8933-2b38-4818-a88c-52d2f487f7b9 -> b7f5a677-4e89-40e1-8324-7619a628ce8b
    - `purple-background-color-default`
        - dark.value: purple-700 -> purple-800
        - dark.uuid: a2a42a1c-c0c9-41a5-80fd-c9316e233918 -> e577d521-0271-4226-a094-624b35a05826
    - `fuchsia-background-color-default`
        - dark.value: fuchsia-700 -> fuchsia-800
        - dark.uuid: 56575347-51b7-4822-98a6-d4275eae2ab5 -> 7b4d71d3-ad78-4e02-a48e-fa79f40854a2
    - `magenta-background-color-default`
        - dark.value: magenta-700 -> magenta-800
        - dark.uuid: f7841ca9-3d7e-419b-870e-3b3747433b38 -> 5867d764-d909-4490-b947-533e89997d0a
    - `neutral-subdued-content-color-down`
        - value: gray-900 -> gray-800
    - `accent-content-color-down`
        - value: accent-color-1100 -> accent-color-1000
    - `negative-content-color-down`
        - value: negative-color-1100 -> negative-color-1000
    - `disabled-static-white-content-color`
        - value: transparent-white-500 -> transparent-white-400
    - `disabled-static-black-content-color`
        - value: transparent-black-500 -> transparent-black-400
    - `neutral-visual-color`
        - dark.uuid: 931b7722-20ef-4c45-8855-4cb4e82e936c -> 35ef6675-7e66-4ef5-8c8d-e8e70939b224
    - `accent-visual-color`
        - dark.uuid: a595a519-0df5-463e-8ec6-f71dd9cefbee -> 8ccd197f-fc8e-4d31-866c-2b96049eea89
    - `informative-visual-color`
        - dark.uuid: 97225780-35eb-4cc8-abc0-fcca31985063 -> fd64c9ca-6ad7-415c-b0b8-2579399e33a5
    - `negative-visual-color`
        - dark.value: negative-color-700 -> negative-color-900
        - dark.uuid: 2f57b877-57ac-4bed-be53-07f4f6353ce2 -> 70cb0316-5b7a-416c-bf93-7d8885c4fce6
    - `notice-visual-color`
        - light.value: notice-color-700 -> notice-color-800
        - dark.uuid: 560ad974-d101-44a2-90c7-8c5b5a3ce273 -> 2759c912-6385-40e4-9ed9-ff2e11815b4d
    - `positive-visual-color`
        - light.value: positive-color-700 -> positive-color-800
        - dark.value: positive-color-800 -> positive-color-900
        - dark.uuid: 8cd5afec-80b0-449f-860d-08d6e111af84 -> 25e8289f-6c82-4485-8920-a187f790cd47
    - `gray-visual-color`
        - dark.uuid: cffe0ccb-5c67-4435-a9b2-b6fb7072417a -> 0f7a39c2-3ee7-4ff0-873f-334c81054b77
    - `red-visual-color`
        - dark.uuid: 1676050d-200e-46d7-9a8f-2e74f0be5cfe -> 870f90ab-7f3e-41b6-9c11-59e9c4ff82c6
    - `orange-visual-color`
        - dark.uuid: 55248d8a-e628-46e2-8882-099162eb18b1 -> e7bf9977-2edf-48bc-8099-ad95e57b55b1
    - `yellow-visual-color`
        - dark.uuid: 231e80f5-8dfe-49b7-9cb5-db35bb93f3aa -> 4a2ebbb5-b8b7-43a0-9d64-4974bb382a8b
    - `chartreuse-visual-color`
        - dark.uuid: d7a17594-69fb-433d-b3cd-e63547ec5940 -> a46d8e05-4f56-4b46-a279-0164abfa42e8
    - `celery-visual-color`
        - dark.uuid: e2239975-bc80-4d08-90fb-e95fe61a1d35 -> 37c1311b-29ed-44ab-b656-a7538726ad77
    - `green-visual-color`
        - dark.uuid: 7418e20d-c751-49ca-8cd2-f0b7fb00831e -> 1219770d-543d-4216-9e87-c158f8a74df6
    - `seafoam-visual-color`
        - dark.uuid: 45a2c99b-29f5-468d-956e-e3c0a78fcfd6 -> 736e4768-7944-40ec-a412-4cd36299e03d
    - `cyan-visual-color`
        - dark.uuid: b4c9bf18-a3d0-423b-85a1-d1de8390b7e9 -> 091a2073-baa0-4cc6-b943-9dddc285ad62
    - `blue-visual-color`
        - dark.uuid: b876d683-a479-41cb-a370-5bdb75f48e9c -> 63fe16ed-70fa-4eaf-918c-f642ff69ce05
    - `indigo-visual-color`
        - dark.uuid: 0f645ef3-051f-4e88-bbd4-3724fa3d93b2 -> 584ccbd4-3243-4041-b665-e2342d2b26e8
    - `purple-visual-color`
        - dark.uuid: e108a5d7-dd3b-4238-ba9b-8c600e1614d0 -> 0ee2957b-c401-4106-8ff3-9de9fa544a03
    - `fuchsia-visual-color`
        - dark.uuid: a336ee97-c030-42e6-ba5f-5ac6585ddeab -> 38e60263-cb08-4090-a653-5acbd1664ae0
    - `magenta-visual-color`
        - dark.uuid: 2b4d2516-870c-4cb4-88a6-dce1d920ad4c -> 178e4bc6-6986-4e77-aab0-78dbe66f8e6f

    </details>

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

- [#444](https://github.com/adobe/spectrum-tokens/pull/444) [`51904cd`](https://github.com/adobe/spectrum-tokens/commit/51904cdabfcb165a560c58664c8bc75be601f28b) Thanks [@marissahuysentruyt](https://github.com/marissahuysentruyt)! - fixing a typo with takeover-dialog-height

  ## Token Diff

  **Updated Token (1):**

  - `takeover-dialog-height`: `1.00%` -> `100%`

## 13.0.0-beta.51

### Patch Changes

- [#441](https://github.com/adobe/spectrum-tokens/pull/441) [`89949e4`](https://github.com/adobe/spectrum-tokens/commit/89949e4d0008baacec05359a83620fa45e35cf5e) Thanks [@GarthDB](https://github.com/GarthDB)! - Change takeover dialog dimensions to use percentages which were previously converted to ems by mistake.

  ## Token Diff

  **Updated Tokens (2):**

  - `takeover-dialog-height`: `1.00em` -> `1.00%`
  - `takeover-dialog-width`: `1.00em` -> `100%`

## 13.0.0-beta.50

### Minor Changes

- [#425](https://github.com/adobe/spectrum-tokens/pull/425) [`91f4536`](https://github.com/adobe/spectrum-tokens/commit/91f4536a416cf6c9e5b0b423bf3ead3233e808fc) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - Adding S2 tokens for number field and takeover dialog components.

  ## Token Diff

  _Tokens added (16):_

  - `in-field-stepper-to-end-extra-large`
  - `in-field-stepper-to-end-large`
  - `in-field-stepper-to-end-medium`
  - `in-field-stepper-to-end-small`
  - `number-field-minimum-width-multiplier`
  - `number-field-visual-to-in-field-stepper-extra-large`
  - `number-field-visual-to-in-field-stepper-large`
  - `number-field-visual-to-in-field-stepper-medium`
  - `number-field-visual-to-in-field-stepper-small`
  - `number-field-with-stepper-minimum-width-extra-large`
  - `number-field-with-stepper-minimum-width-large`
  - `number-field-with-stepper-minimum-width-medium`
  - `number-field-with-stepper-minimum-width-small`
  - `takeover-dialog-height`
  - `takeover-dialog-width`
  - `window-to-edge`

## 13.0.0-beta.49

### Minor Changes

- [#418](https://github.com/adobe/spectrum-tokens/pull/418) [`45ed87b`](https://github.com/adobe/spectrum-tokens/commit/45ed87b43af53370f74fc46c545b4c13005f381c) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - ## Design Motivation

  Made the following changes to component typography tokens for both mobile and desktop.

  ## Token Diff

  _Tokens added (2):_

  - `heading-cjk-size-xxxxl`
  - `heading-size-xxxxl`

  _Tokens changed (7):_

  - `heading-sans-serif-font-weight`: `bold-font-weight` -> `extra-bold-font-weight`
  - `heading-cjk-heavy-font-weight`: `black-font-weight` -> `extra-bold-font-weight`
  - `heading-sans-serif-emphasized-font-weight`: `bold-font-weight` -> `extra-bold-font-weight`
  - `heading-size-s`: `font-size-300` -> `font-size-400`
  - `heading-size-xs`: `font-size-200` -> `font-size-300`
  - `heading-cjk-size-xxxl`: `font-size-1300` -> `font-size-1200`
  - `heading-cjk-size-xxl`: `font-size-900` -> `font-size-1000`

- [#422](https://github.com/adobe/spectrum-tokens/pull/422) [`4673d13`](https://github.com/adobe/spectrum-tokens/commit/4673d1383602d81484ae346dd278a28a26f5d91b) Thanks [@GarthDB](https://github.com/GarthDB)! - Added tokens for s2 detail typography

  _New tokens (6)_

  - `detail-cjk-size-xs`
  - `detail-cjk-size-s`
  - `detail-cjk-size-m`
  - `detail-cjk-size-l`
  - `detail-cjk-size-xl`
  - `detail-size-xs`

  _Updated token values (13)_

  - `detail-sans-serif-font-weight`: `bold-font-weight` -> `medium-font-weight`
  - `detail-serif-font-weight`: `bold-font-weight` -> `medium-font-weight`
  - `detail-cjk-font-weight`: `extra-bold-font-weight` -> `bold-font-weight`
  - `detail-cjk-strong-font-weight`: `black-font-weight` -> `extra-bold-font-weight`
  - `detail-sans-serif-emphasized-font-weight`: `bold-font-weight` -> `regular-font-weight`
  - `detail-serif-emphasized-font-weight`: `bold-font-weight` -> `medium-font-weight`
  - `detail-cjk-emphasized-font-weight`: `black-font-weight` -> `extra-bold-font-weight`
  - `detail-cjk-strong-emphasized-font-weight`: `black-font-weight` -> `extra-bold-font-weight`
  - `detail-size-xl`: `font-size-200` -> `font-size-300`
  - `detail-size-l`: `font-size-100` -> `font-size-200`
  - `detail-size-m`: `font-size-75` -> `font-size-100`
  - `detail-size-s`: `font-size-50` -> `font-size-75`
  - `detail-color`: `gray-900` -> `gray-600`

## 13.0.0-beta.48

### Minor Changes

- [#415](https://github.com/adobe/spectrum-tokens/pull/415) [`caca973`](https://github.com/adobe/spectrum-tokens/commit/caca973300d34fc688fb828633b1da2ba8284990) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - 1. New typography tokens:

  - Letter spacing, text-align, cjk

  1. New gradient stop tokens
  1. New component tokens for bar panel, rating, segmented control, slider, select box
  1. New static color tokens

  _Tokens added (51):_

  - `letter-spacing`
  - `text-align-start`
  - `text-align-center`
  - `text-align-end`
  - `body-size-xxs`
  - `body-cjk-size-xxxl`
  - `body-cjk-size-xxl`
  - `body-cjk-size-xl`
  - `body-cjk-size-l`
  - `body-cjk-size-m`
  - `body-cjk-size-s`
  - `body-cjk-size-xs`
  - `body-cjk-size-xxs`
  - `gradient-stop-1-genai`
  - `gradient-stop-2-genai`
  - `gradient-stop-3-genai`
  - `gradient-stop-1-premium`
  - `gradient-stop-2-premium`
  - `gradient-stop-3-premium`
  - `bar-panel-width`
  - `bar-panel-minimum-width`
  - `bar-panel-maximum-width`
  - `bar-panel-spacing-extra-spacious`
  - `rating-top-to-content-area-small`
  - `rating-bottom-to-content-area-small`
  - `rating-edge-to-content-area-small`
  - `rating-top-to-content-area-medium`
  - `rating-bottom-to-content-area-medium`
  - `rating-edge-to-content-area-medium`
  - `rating-width-small`
  - `rating-height-small`
  - `rating-width-medium`
  - `rating-height-medium`
  - `segmented-control-selection-border-width`
  - `slider-handle-precision-width`
  - `slider-track-height-medium`
  - `slider-track-height-large`
  - `segmented-control-item-height`
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
  - `bar-panel-gripper-color`
  - `bar-panel-gripper-color-drag`
  - `select-box-selected-border-color`

  _Token values updated (9):_

  - `font-size-1200`
    - `desktop`: `50px` -> `51px`
  - `font-size-1300`
    - `desktop`: `60px` -> `58px`
  - `cjk-letter-spacing`: `0.05em` -> `letter-spacing`
  - `body-cjk-strong-font-weight`: `black-font-weight` -> `extra-bold-font-weight`
  - `body-cjk-strong-emphasized-font-weight`: `black-font-weight` -> `extra-bold-font-weight`
  - `slider-control-to-field-label-small`
    - `desktop`: `5px` -> `-4px`
    - `mobile`: `6px` -> `-8px`
  - `slider-control-to-field-label-medium`
    - `desktop`: `8px` -> `-12px`
    - `mobile`: `10px` -> `-16px`
  - `slider-control-to-field-label-large`
    - `desktop`: `11px` -> `-16px`
    - `mobile`: `14px` -> `-20px`
  - `slider-control-to-field-label-extra-large`
    - `desktop`: `14px` -> `-20px`
    - `mobile`: `17px` -> `-28px`

## 13.0.0-beta.47

### Minor Changes

- [`75a573b`](https://github.com/adobe/spectrum-tokens/commit/75a573bcbb7b71ecdf5f246682755de24dae5afc) Thanks [@GarthDB](https://github.com/GarthDB)! - S2 subtle and visual colors update
  Updated S2 Table tokens

  <details><summary>Tokens added (42):</summary>

  - `illustrated-message-maximum-width`
  - `side-focus-indicator`
  - `table-row-bottom-to-text-extra-large`
  - `table-row-bottom-to-text-extra-large-regular`
  - `table-row-bottom-to-text-large`
  - `table-row-bottom-to-text-large-regular`
  - `table-row-bottom-to-text-medium`
  - `table-row-bottom-to-text-medium-regular`
  - `table-row-bottom-to-text-small`
  - `table-row-bottom-to-text-small-regular`
  - `table-row-checkbox-to-top-extra-large`
  - `table-row-checkbox-to-top-extra-large-regular`
  - `table-row-checkbox-to-top-large`
  - `table-row-checkbox-to-top-large-regular`
  - `table-row-checkbox-to-top-medium`
  - `table-row-checkbox-to-top-medium-regular`
  - `table-row-checkbox-to-top-small`
  - `table-row-checkbox-to-top-small-regular`
  - `table-row-height-extra-large`
  - `table-row-height-extra-large-regular`
  - `table-row-height-large`
  - `table-row-height-large-regular`
  - `table-row-height-medium`
  - `table-row-height-medium-regular`
  - `table-row-height-small`
  - `table-row-height-small-regular`
  - `table-row-top-to-text-extra-large`
  - `table-row-top-to-text-extra-large-regular`
  - `table-row-top-to-text-large`
  - `table-row-top-to-text-large-regular`
  - `table-row-top-to-text-medium`
  - `table-row-top-to-text-medium-regular`
  - `table-row-top-to-text-small`
  - `table-row-top-to-text-small-regular`
  - `table-thumbnail-to-top-minimum-extra-large`
  - `table-thumbnail-to-top-minimum-extra-large-regular`
  - `table-thumbnail-to-top-minimum-large`
  - `table-thumbnail-to-top-minimum-large-regular`
  - `table-thumbnail-to-top-minimum-medium`
  - `table-thumbnail-to-top-minimum-medium-regular`
  - `table-thumbnail-to-top-minimum-small`
  - `table-thumbnail-to-top-minimum-small-regular`

  </details>

  <details><summary>Tokens updated (101):</summary>

  - `informative-subtle-background-color-default`
    - light: `blue-200` -> `informative-color-200`
    - dark: `blue-200` -> `informative-color-300`
  - `positive-subtle-background-color-default`
    - light: `green-200` -> `positive-color-200`
    - dark: `green-200` -> `positive-color-300`
  - `notice-subtle-background-color-default`
    - light: `orange-200` -> `notice-color-200`
    - dark: `orange-200` -> `notice-color-300`
  - `negative-subtle-background-color-default`
    - light: `red-200` -> `negative-color-200`
    - dark: `red-200` -> `negative-color-300`
  - `table-column-header-row-top-to-text-medium`
    - desktop: `7px` -> `6px`
  - `table-row-height-small-regular`
    - desktop: `32px` -> `table-row-height-small`
    - mobile: `40px` -> `table-row-height-small`
  - `table-row-height-medium-regular`
    - desktop: `40px` -> `table-row-height-medium`
    - mobile: `50px` -> `table-row-height-medium`
  - `table-row-height-large-regular`
    - desktop: `48px` -> `table-row-height-large`
    - mobile: `60px` -> `table-row-height-large`
  - `table-row-height-extra-large-regular`
    - desktop: `56px` -> `table-row-height-extra-large`
    - mobile: `70px` -> `table-row-height-extra-large`
  - `table-row-top-to-text-small-regular`
    - desktop: `8px` -> `table-row-top-to-text-small`
    - mobile: `10px` -> `table-row-top-to-text-small`
  - `table-row-top-to-text-medium-regular`
    - desktop: `11px` -> `table-row-top-to-text-medium`
    - mobile: `14px` -> `table-row-top-to-text-medium`
  - `table-row-top-to-text-large-regular`
    - desktop: `14px` -> `table-row-top-to-text-large`
    - mobile: `18px` -> `table-row-top-to-text-large`
  - `table-row-top-to-text-extra-large-regular`
    - desktop: `17px` -> `table-row-top-to-text-extra-large`
    - mobile: `21px` -> `table-row-top-to-text-extra-large`
  - `table-row-bottom-to-text-small-regular`
    - desktop: `9px` -> `table-row-bottom-to-text-small`
    - mobile: `11px` -> `table-row-bottom-to-text-small`
  - `table-row-bottom-to-text-medium-regular`
    - desktop: `12px` -> `table-row-bottom-to-text-medium`
    - mobile: `15px` -> `table-row-bottom-to-text-medium`
  - `table-row-bottom-to-text-large-regular`
    - desktop: `14px` -> `table-row-bottom-to-text-large`
    - mobile: `18px` -> `table-row-bottom-to-text-large`
  - `table-row-bottom-to-text-extra-large-regular`
    - desktop: `17px` -> `table-row-bottom-to-text-extra-large`
    - mobile: `22px` -> `table-row-bottom-to-text-extra-large`
  - `table-row-top-to-text-medium-spacious`
    - mobile: `18px` -> `16px`
  - `table-header-row-checkbox-to-top-medium`
    - desktop: `9px` -> `8px`
    - mobile: `13px` -> `11px`
  - `table-row-checkbox-to-top-small-regular`
    - desktop: `10px` -> `table-row-checkbox-to-top-small`
    - mobile: `14px` -> `table-row-checkbox-to-top-small`
  - `table-row-checkbox-to-top-medium-compact`
    - desktop: `9px` -> `8px`
    - mobile: `13px` -> `11px`
  - `table-row-checkbox-to-top-medium-regular`
    - desktop: `13px` -> `table-row-checkbox-to-top-medium`
    - mobile: `18px` -> `table-row-checkbox-to-top-medium`
  - `table-row-checkbox-to-top-medium-spacious`
    - desktop: `17px` -> `16px`
    - mobile: `23px` -> `21px`
  - `table-row-checkbox-to-top-large-regular`
    - desktop: `16px` -> `table-row-checkbox-to-top-large`
    - mobile: `22px` -> `table-row-checkbox-to-top-large`
  - `table-row-checkbox-to-top-extra-large-regular`
    - desktop: `19px` -> `table-row-checkbox-to-top-extra-large`
    - mobile: `26px` -> `table-row-checkbox-to-top-extra-large`
  - `table-thumbnail-to-top-minimum-small-regular`
    - desktop: `5px` -> `table-thumbnail-to-top-minimum-small`
    - mobile: `6px` -> `table-thumbnail-to-top-minimum-small`
  - `table-thumbnail-to-top-minimum-medium-regular`
    - desktop: `7px` -> `table-thumbnail-to-top-minimum-medium`
    - mobile: `9px` -> `table-thumbnail-to-top-minimum-medium`
  - `table-thumbnail-to-top-minimum-large-regular`
    - desktop: `8px` -> `table-thumbnail-to-top-minimum-large`
    - mobile: `10px` -> `table-thumbnail-to-top-minimum-large`
  - `table-thumbnail-to-top-minimum-extra-large-regular`
    - desktop: `8px` -> `table-thumbnail-to-top-minimum-extra-large`
    - mobile: `10px` -> `table-thumbnail-to-top-minimum-extra-large`
  - `blue-800`
    - dark: `rgb(69, 110, 254)` -> `rgb(64, 105, 253)`
  - `red-800`
    - dark: `rgb(230, 54, 35)` -> `rgb(223, 52, 34)`
  - `orange-800`
    - dark: `rgb(205, 86, 0)` -> `rgb(199, 82, 0)`
  - `yellow-800`
    - dark: `rgb(169, 110, 0)` -> `rgb(164, 106, 0)`
  - `chartreuse-800`
    - dark: `rgb(109, 131, 0)` -> `rgb(106, 127, 0)`
  - `celery-800`
    - dark: `rgb(69, 138, 19)` -> `rgb(66, 134, 18)`
  - `green-800`
    - dark: `rgb(6, 140, 82)` -> `rgb(6, 136, 80)`
  - `seafoam-800`
    - dark: `rgb(8, 138, 116)` -> `rgb(8, 134, 112)`
  - `cyan-800`
    - dark: `rgb(15, 128, 194)` -> `rgb(13, 125, 186)`
  - `indigo-800`
    - dark: `rgb(119, 97, 252)` -> `rgb(116, 91, 252)`
  - `purple-800`
    - dark: `rgb(161, 84, 229)` -> `rgb(157, 78, 228)`
  - `fuchsia-800`
    - dark: `rgb(192, 64, 212)` -> `rgb(186, 60, 206)`
  - `magenta-800`
    - dark: `rgb(231, 41, 105)` -> `rgb(224, 38, 101)`
  - `pink-800`
    - dark: `rgb(220, 47, 156)` -> `rgb(213, 45, 151)`
  - `turquoise-800`
    - dark: `rgb(9, 135, 147)` -> `rgb(9, 131, 142)`
  - `brown-800`
    - dark: `rgb(148, 118, 73)` -> `rgb(143, 114, 69)`
  - `silver-800`
    - dark: `rgb(123, 123, 123)` -> `rgb(118, 118, 118)`
  - `cinnamon-800`
    - dark: `rgb(179, 103, 64)` -> `rgb(176, 98, 59)`
  - `accent-background-color-default`
    - dark: `accent-color-700` -> `accent-color-800`
  - `accent-background-color-hover`
    - dark: `accent-color-600` -> `accent-color-700`
  - `accent-background-color-down`
    - dark: `accent-color-600` -> `accent-color-700`
  - `accent-background-color-key-focus`
    - dark: `accent-color-600` -> `accent-color-700`
  - `informative-background-color-default`
    - dark: `informative-color-700` -> `informative-color-800`
  - `informative-background-color-hover`
    - dark: `informative-color-600` -> `informative-color-700`
  - `informative-background-color-down`
    - dark: `informative-color-600` -> `informative-color-700`
  - `informative-background-color-key-focus`
    - dark: `informative-color-600` -> `informative-color-700`
  - `negative-background-color-default`
    - dark: `negative-color-700` -> `negative-color-800`
  - `negative-background-color-hover`
    - dark: `negative-color-600` -> `negative-color-700`
  - `negative-background-color-down`
    - dark: `negative-color-600` -> `negative-color-700`
  - `negative-background-color-key-focus`
    - dark: `negative-color-600` -> `negative-color-700`
  - `positive-background-color-default`
    - dark: `positive-color-700` -> `positive-color-800`
  - `positive-background-color-hover`
    - dark: `positive-color-600` -> `positive-color-700`
  - `positive-background-color-down`
    - dark: `positive-color-600` -> `positive-color-700`
  - `positive-background-color-key-focus`
    - dark: `positive-color-600` -> `positive-color-700`
  - `red-background-color-default`
    - dark: `red-700` -> `red-800`
  - `green-background-color-default`
    - dark: `green-700` -> `green-800`
  - `seafoam-background-color-default`
    - dark: `seafoam-700` -> `seafoam-800`
  - `cyan-background-color-default`
    - dark: `cyan-700` -> `cyan-800`
  - `blue-background-color-default`
    - dark: `blue-700` -> `blue-800`
  - `indigo-background-color-default`
    - dark: `indigo-700` -> `indigo-800`
  - `purple-background-color-default`
    - dark: `purple-700` -> `purple-800`
  - `fuchsia-background-color-default`
    - dark: `fuchsia-700` -> `fuchsia-800`
  - `magenta-background-color-default`
    - dark: `magenta-700` -> `magenta-800`
  - `negative-visual-color`
    - dark: `negative-color-700` -> `negative-color-900`
  - `notice-visual-color`
    - light: `notice-color-700` -> `notice-color-800`
  - `positive-visual-color`
    - light: `positive-color-700` -> `positive-color-800`
    - dark: `positive-color-800` -> `positive-color-900`
  - `brown-background-color-default`
    - dark: `brown-700` -> `brown-800`
  - `cinnamon-background-color-default`
    - dark: `cinnamon-700` -> `cinnamon-800`
  - `pink-background-color-default`
    - dark: `pink-700` -> `pink-800`
  - `silver-background-color-default`
    - dark: `silver-700` -> `silver-800`
  - `turquoise-background-color-default`
    - dark: `turquoise-700` -> `turquoise-800`
  - `neutral-subtle-background-color-default`
    - light: `gray-100` -> `gray-100`
    - dark: `gray-100` -> `gray-300`
  - `accent-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `accent-color-200`
    - dark: `rgba(0, 0, 0, 0.6)` -> `accent-color-300`
  - `gray-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `gray-100`
    - dark: `rgba(0, 0, 0, 0.6)` -> `gray-300`
  - `blue-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `blue-200`
    - dark: `rgba(0, 0, 0, 0.6)` -> `blue-300`
  - `green-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `green-200`
    - dark: `rgba(0, 0, 0, 0.6)` -> `green-300`
  - `orange-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `orange-200`
    - dark: `rgba(0, 0, 0, 0.6)` -> `orange-300`
  - `red-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `red-200`
    - dark: `rgba(0, 0, 0, 0.6)` -> `red-300`
  - `brown-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `brown-200`
    - dark: `rgba(0, 0, 0, 0.6)` -> `brown-300`
  - `cinnamon-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `cinnamon-200`
    - dark: `rgba(0, 0, 0, 0.6)` -> `cinnamon-300`
  - `celery-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `celery-200`
    - dark: `rgba(0, 0, 0, 0.6)` -> `celery-300`
  - `chartreuse-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `chartreuse-200`
    - dark: `rgba(0, 0, 0, 0.6)` -> `chartreuse-300`
  - `cyan-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `cyan-200`
    - dark: `rgba(0, 0, 0, 0.6)` -> `cyan-300`
  - `fuchsia-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `fuchsia-200`
    - dark: `rgba(0, 0, 0, 0.6)` -> `fuchsia-300`
  - `indigo-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `indigo-200`
    - dark: `rgba(0, 0, 0, 0.6)` -> `indigo-300`
  - `magenta-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `magenta-200`
    - dark: `rgba(0, 0, 0, 0.6)` -> `magenta-300`
  - `pink-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `pink-200`
    - dark: `rgba(0, 0, 0, 0.6)` -> `pink-300`
  - `purple-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `purple-200`
    - dark: `rgba(0, 0, 0, 0.6)` -> `purple-300`
  - `seafoam-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `seafoam-200`
    - dark: `rgba(0, 0, 0, 0.6)` -> `seafoam-300`
  - `silver-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `silver-200`
    - dark: `rgba(0, 0, 0, 0.6)` -> `silver-300`
  - `turquoise-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `turquoise-200`
    - dark: `rgba(0, 0, 0, 0.6)` -> `turquoise-300`
  - `yellow-subtle-background-color-default`
    - light: `rgba(0, 0, 0, 0.2)` -> `yellow-200`
    - dark: `rgba(0, 0, 0, 0.6)` -> `yellow-300`

  </details>

## 13.0.0-beta.46

### Minor Changes

- [#396](https://github.com/adobe/spectrum-tokens/pull/396) [`4fcfe5b`](https://github.com/adobe/spectrum-tokens/commit/4fcfe5bd83214a7ca3644646bbf0f38802a20f43) Thanks [@larz0](https://github.com/larz0)! - Added brand new tokens for the S2 Standard Panel:

  ## Design Motivation

  Added tokens needed for the new S2 standard panel component.

  ## Token Diff

  _Tokens Added (12):_

  - `standard-panel-width`
  - `standard-panel-minimum-width`
  - `standard-panel-maximum-width`
  - `standard-panel-top-to-close-button-compact`
  - `standard-panel-top-to-close-button-regular`
  - `standard-panel-top-to-close-button-spacious`
  - `standard-panel-edge-to-close-button-compact`
  - `standard-panel-edge-to-close-button-regular`
  - `standard-panel-edge-to-close-button-spacious`
  - `standard-panel-title-font-size`
  - `standard-panel-gripper-color`
  - `standard-panel-gripper-color-drag`

## 13.0.0-beta.45

### Minor Changes

- [#390](https://github.com/adobe/spectrum-tokens/pull/390) [`cc9c304`](https://github.com/adobe/spectrum-tokens/commit/cc9c3048893058c3f01d6f1ce4688d8ab3716397) Thanks [@lynnhao](https://github.com/lynnhao)! - Updated code tokens for S2

  ## Design Motivation

  These code token updates include some fixes to CJK font-weights to match the Latin font-weights when possible. We added CJK size tokens for consistency with other typography style tokens. Note that the new CJK size tokens currently point to the default code font-size tokens since Source Code Pro handles Latin and CJK sizing comparably.

  ## Token Diff

  _Tokens added (5):_

  - `code-cjk-size-l`
  - `code-cjk-size-m`
  - `code-cjk-size-s`
  - `code-cjk-size-xl`
  - `code-cjk-size-xs`

  _Token values updated (2):_

  - `code-cjk-strong-emphasized-font-weight`
  - `code-cjk-strong-font-weight`

## 13.0.0-beta.44

### Minor Changes

- [#388](https://github.com/adobe/spectrum-tokens/pull/388) [`58425e6`](https://github.com/adobe/spectrum-tokens/commit/58425e67b2d4cbd716205d4d502cc823245811fe) Thanks [@lynnhao](https://github.com/lynnhao)! - Updated avatar and avatar group tokens

  ## Description

  - Updated avatar size tokens, including all sizes from `75` to `700`
  - Added new avatar size tokens, from `800` to `1500`
  - Added new avatar border thickness and color tokens
  - Added avatar group size tokens, from `50` to `500`
  - Added avatar group spacing tokens, from `50` to `500`

  ## Motivation and context

  - Avatar: added new sizes and updated existing sizes to better match other components and work across a variety of use cases.
    - ⚠️ Important note: Accepting updates from this release will update the avatar sizes. The largest change in size is 8px. In some cases, you may want to relink to a new size. View the migration guide below to find the closest recommended size:

  | Former avatar size | Available avatar size                    |
  | :----------------- | :--------------------------------------- |
  | size 50 (16 x 16)  | size 50 (16 x 16)                        |
  | size 75 (18 x 18)  | size 50 (16 x 16) or size 75 (20 x 20)   |
  | size 100 (20 x 20) | size 75 (20 x 20)                        |
  | size 200 (22 x 22) | size 75 (20 x 20) or size 100 (24 x 24)  |
  | size 300 (26 x 26) | size 100 (24 x 24) or size 200 (28 x 28) |
  | size 400 (28 x 28) | size 200 (28 x 28)                       |
  | size 500 (32 x 32) | size 300 (32 x 32)                       |
  | size 600 (36 x 36) | size 400 (36 x 36)                       |
  | size 700 (40 x 40) | size 500 (40 x 40)                       |
  | --                 | size 600 (44 x 44)                       |
  | --                 | size 700 (48 x 48)                       |
  | --                 | size 800 (52 x 52)                       |
  | --                 | size 900 (56 x 56)                       |
  | --                 | size 1000 (64 x 64)                      |
  | --                 | size 1100 (72 x 72)                      |
  | --                 | size 1200 (80 x 80)                      |
  | --                 | size 1300 (88 x 88)                      |
  | --                 | size 1400 (96 x 96)                      |
  | --                 | size 1500 (104 x 104)                    |

  ## Token Diff

  _Tokens added (24):_

  - `avatar-border-color`
  - `avatar-border-width`
  - `avatar-group-size-100`
  - `avatar-group-size-200`
  - `avatar-group-size-300`
  - `avatar-group-size-400`
  - `avatar-group-size-50`
  - `avatar-group-size-500`
  - `avatar-group-size-75`
  - `avatar-size-1000`
  - `avatar-size-1100`
  - `avatar-size-1200`
  - `avatar-size-1300`
  - `avatar-size-1400`
  - `avatar-size-1500`
  - `avatar-size-800`
  - `avatar-size-900`
  - `avatar-to-avatar-100`
  - `avatar-to-avatar-200`
  - `avatar-to-avatar-300`
  - `avatar-to-avatar-400`
  - `avatar-to-avatar-50`
  - `avatar-to-avatar-500`
  - `avatar-to-avatar-75`

  _Token values updated (8):_

  - `avatar-size-100`
  - `avatar-size-200`
  - `avatar-size-300`
  - `avatar-size-400`
  - `avatar-size-500`
  - `avatar-size-600`
  - `avatar-size-700`
  - `avatar-size-75`

## 13.0.0-beta.43

### Minor Changes

- [#384](https://github.com/adobe/spectrum-tokens/pull/384) [`681b4b0`](https://github.com/adobe/spectrum-tokens/commit/681b4b0094d31bae4c9b1b095fa59d6448c26cab) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - Added dragged drop shadow tokens that point to new 300 global drop shadow tokens

  ## Design Motivation

  These are new foundational drop shadow tokens that represent a higher elevation when items are dragged. The more prominent shadow also brings more visual focus to the dragged item. They will be used in the standard panel "dragged" state, as well as in future component updates, to be determined.

  ## Token Diff

  _Tokens added (8):_

  - `drop-shadow-blur-300`
  - `drop-shadow-color-300`
  - `drop-shadow-dragged-blur`
  - `drop-shadow-dragged-color`
  - `drop-shadow-dragged-x`
  - `drop-shadow-dragged-y`
  - `drop-shadow-x-300`
  - `drop-shadow-y-300`

## 13.0.0-beta.42

### Minor Changes

- [#382](https://github.com/adobe/spectrum-tokens/pull/382) [`2af3850`](https://github.com/adobe/spectrum-tokens/commit/2af3850a554812fd9c1b3e6fd902a746c9ac42c7) Thanks [@nabuhasan](https://github.com/nabuhasan)! - Updated S2 swatch tokens and added swatch-group tokens in S2 Color and S2 Non-color data sets, respectively.

  ## Design Motivation

  Swatch and swatch group components are being formalized as Spectrum 2 components. These tokens define the design data needed for implementation. Changes include updated corner rounding, colors and spacing for spacious density.

  For more information, [view Jira ticket](https://jira.corp.adobe.com/browse/SDS-13497).

  ## Token Diff

  _Tokens added (3):_

  - `swatch-group-spacing-spacious`
  - `swatch-group-border-opacity`
  - `swatch-group-border-color`

  _Tokens values updated (3):_

  - `swatch-border-color`: `gray-900` -> `gray-1000`
  - `swatch-border-opacity`: `0.51` -> `0.42`
  - `swatch-disabled-icon-border-opacity`: `0.51` -> `0.42`

## 13.0.0-beta.41

### Minor Changes

- [#375](https://github.com/adobe/spectrum-tokens/pull/375) [`6e3be6d`](https://github.com/adobe/spectrum-tokens/commit/6e3be6d8a458efa1752a8dd1360f03fa83f84c37) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - - [Updated thumbnail size tokens and added new tokens](https://github.com/adobe/spectrum-tokens-studio-data/pull/144)

  - [Updated S2 Action bar tokens](https://github.com/adobe/spectrum-tokens-studio-data/pull/149)

  ## Design Motivation

  Thumbnail: updated sizes in order for opacity checkerboards to translate better in implementation.

  ⚠️ Important note: Accepting updates from this release will update the thumbnail sizes. The change in size is no more than 4 px. In some cases, you may want to relink to a new size. View the migration guide below to find the closest recommended size:

  | Former thumbnail size | Available thumbnail size                 |
  | :-------------------- | :--------------------------------------- |
  | size 50 (16 x 16)     | size 50 (16 x 16)                        |
  | size 75 (18 x 18)     | size 75 (20 x 20)                        |
  | size 100 (20 x 20)    | size 75 (20 x 20)                        |
  | size 200 (22 x 22)    | size 100 (24 x 24)                       |
  | size 300 (26 x 26)    | size 200 (28 x 28)                       |
  | size 400 (28 x 28)    | size 200 (28 x 28)                       |
  | size 500 (32 x 32)    | size 300 (32 x 32)                       |
  | size 600 (36 x 36)    | size 400 (36 x 36)                       |
  | size 700 (40 x 40)    | size 500 (40 x 40)                       |
  | size 800 (44 x 44)    | size 600 (44 x 44)                       |
  | size 900 (50 x 50)    | size 700 (48 x 48) or size 800 (52 x 52) |
  | size 1000 (56 x 56)   | size 900 (56 x 56)                       |
  | --                    | size 1000 (64 x 64)                      |

  Action bar: Updated S2 action bar (non-color) in respective desktop and mobile layout sets.

  ## Token Diff

  _Tokens added (8):_

  - `action-bar-top-to-content-area`
  - `action-bar-bottom-to-content-area`
  - `action-bar-edge-to-content-area`
  - `action-bar-close-button-to-counter`
  - `action-bar-counter-font-size`
  - `thumbnail-opacity-checkerboard-square-size`
  - `thumbnail-corner-radius`
  - `text-to-control-50`

  _Tokens updated (2):_

  - `action-bar-height`
  - `action-bar-top-to-item-counter`

  _Token values updated (11):_

  - `thumbnail-size-75`
    - `desktop`: `18px` -> `20px`
    - `mobile`: `22px` -> `24px`
  - `thumbnail-size-100`
    - `desktop`: `20px` -> `24px`
    - `mobile`: `26px` -> `28px`
  - `thumbnail-size-200`
    - `desktop`: `22px` -> `28px`
    - `mobile`: `28px` -> `32px`
  - `thumbnail-size-300`
    - `desktop`: `26px` -> `32px`
    - `mobile`: `32px` -> `36px`
  - `thumbnail-size-400`
    - `desktop`: `28px` -> `36px`
    - `mobile`: `36px` -> `40px`
  - `thumbnail-size-500`
    - `desktop`: `32px` -> `40px`
    - `mobile`: `40px` -> `44px`
  - `thumbnail-size-600`
    - `desktop`: `36px` -> `44px`
    - `mobile`: `46px` -> `48px`
  - `thumbnail-size-700`
    - `desktop`: `40px` -> `48px`
    - `mobile`: `50px` -> `52px`
  - `thumbnail-size-800`
    - `desktop`: `44px` -> `52px`
    - `mobile`: `55px` -> `56px`
  - `thumbnail-size-900`
    - `desktop`: `50px` -> `56px`
    - `mobile`: `62px` -> `64px`
  - `thumbnail-size-1000`
    - `desktop`: `56px` -> `64px`
    - `mobile`: `70px` -> `72px`

## 13.0.0-beta.40

### Minor Changes

- [#373](https://github.com/adobe/spectrum-tokens/pull/373) [`e04bddf`](https://github.com/adobe/spectrum-tokens/commit/e04bddf65549c87cd314b54966fe066ae649b7f7) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - - Updated S2 accordion tokens (non-color) in respective desktop and mobile layout sets

  - Added S2 meter tokens, including both color and non-color.

  ## Design Motivation

  - Accordion component is being formalized as a Spectrum 2 component. These net-new tokens define the design data needed for implementation. Introducing content-area-edge-to-content tokens enhances inclusivity for various design patterns. For more information, [view Jira ticket](https://jira.corp.adobe.com/browse/SDS-13435).
  - Meter component is being formalized as a Spectrum 2 component. These net-new tokens define the design data needed for implementation. Introducing static tokens enables us to standardize the use of tokens across various components with indicators and tracks. This includes progress bars, progress circles, and potentially sliders in the future. For more information, [view Jira ticket](https://jira.corp.adobe.com/browse/SDS-13414).

  ## Token Diff

  _Tokens added (18):_

  - `accordion-content-area-edge-to-content-extra-large`
  - `accordion-content-area-edge-to-content-large`
  - `accordion-content-area-edge-to-content-medium`
  - `accordion-content-area-edge-to-content-small`
  - `accordion-disclosure-indicator-to-text-extra-large`
  - `accordion-disclosure-indicator-to-text-large`
  - `accordion-disclosure-indicator-to-text-medium`
  - `accordion-disclosure-indicator-to-text-small`
  - `accordion-item-to-divider`
  - `meter-thickness-extra-large`
  - `meter-thickness-medium`
  - `static-black-text-color`
  - `static-black-track-color`
  - `static-black-track-indicator-color`
  - `static-white-text-color`
  - `static-white-track-color`
  - `static-white-track-indicator-color`
  - `track-color`

  _Newly deprecated tokens (2):_

  - `accordion-edge-to-disclosure-indicator`
  - `accordion-disclosure-indicator-to-text`

  _Tokens updated (1):_

  - `meter-thickness-large`

## 13.0.0-beta.39

### Minor Changes

- [#364](https://github.com/adobe/spectrum-tokens/pull/364) [`f96ffca`](https://github.com/adobe/spectrum-tokens/commit/f96ffca4990547f8ddc8341d141e0edc65b872d9) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - Added coach-indicator s2 tokens

  ## Token Diff

  _Tokens added (8):_

  - `coach-indicator-collapsed-gap`
  - `coach-indicator-collapsed-ring-rounding-increment`
  - `coach-indicator-collapsed-ring-thickness`
  - `coach-indicator-color`
  - `coach-indicator-expanded-gap`
  - `coach-indicator-expanded-ring-rounding-increment`
  - `coach-indicator-expanded-ring-thickness`
  - `coach-indicator-opacity`

## 13.0.0-beta.38

### Minor Changes

- [#360](https://github.com/adobe/spectrum-tokens/pull/360) [`f73a0b4`](https://github.com/adobe/spectrum-tokens/commit/f73a0b40464f1c73f2d9e8f6cf97da926e392ac7) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - - Fixed token type from Sizing to Font size for contextual-help-body-size and `contextual-help-title-size`

  - Renamed tokens by deprecating previous ones and creating new ones, with font in the token name
    Updated value of `contextual-help-title-font-size`

  Marked the the following tokens in Tokens Studio for deprecation:

  - `negative-subdued-background-color-default` ( --> points to `negative-subtle-background-color-default`)
  - `negative-subdued-background-color-hover`
  - `negative-subdued-background-color-down`
  - `negative-subdued-background-color-key-focus`

  ## Design motivation

  - The updated type sorts them correctly in the Tokens Studio data
  - The updated value reflects the latest design for Spectrum 2, using the new title style instead of heading
  - The negative-subdued tokens were deprecated because the tag "error" variant has been deprecated and are no longer needed in the system. A new "subtle" token has been added for the in-line alert use case.

  ## Token diff

  _Tokens added (2):_

  - `contextual-help-body-font-size`
  - `contextual-help-title-font-size`

  _Newly deprecated Tokens (6):_

  - `contextual-help-body-size`
  - `contextual-help-title-size`
  - `negative-subdued-background-color-default`
  - `negative-subdued-background-color-hover`
  - `negative-subdued-background-color-down`
  - `negative-subdued-background-color-key-focus`

## 13.0.0-beta.37

### Minor Changes

- [#355](https://github.com/adobe/spectrum-tokens/pull/355) [`783a200`](https://github.com/adobe/spectrum-tokens/commit/783a200983efa8e1f2cc31fd40ac3ed7298bb312) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - Updated tokens according to updated token spec for Spectrum 2, including new and deprecated tokens

  ## Design Motivation

  ### Change 1: Updated terminology to align with t-shirt sizes

  Previously in S1, the breadcrumb variants were default, compact, and multiline. However, in S2, we have aligned breadcrumb to t-shirt sizes, resulting in the following changes:

  - Breadcrumbs (default) -> Breadcrumbs (L)
  - Breadcrumbs (compact) -> Breadcrumbs (M)
  - Breadcrumbs (multiline) -> Breadcrumbs (multiline)

  ### Change 2: Updated truncated menu button sizes and spacing

  Other structural changes

  - In S1 all variants used M sized action button – now we use S, M, L sized action buttons for respective sizes.
  - In S1 all variants had same spacing 8px around chevron, now we use different spacings for all the three variants

  ## Token Diff

  _Tokens added (11):_

  - `breadcrumbs-separator-to-bottom-text-multiline`
  - `breadcrumbs-start-edge-to-text-large`
  - `breadcrumbs-start-edge-to-text-medium`
  - `breadcrumbs-start-edge-to-text-multiline`
  - `breadcrumbs-top-to-separator-large`
  - `breadcrumbs-top-to-separator-medium`
  - `breadcrumbs-top-to-separator-multiline`
  - `breadcrumbs-truncated-menu-to-separator`
  - `breadcrumbs-text-to-separator-large`
  - `breadcrumbs-text-to-separator-medium`
  - `breadcrumbs-text-to-separator-multiline`

  _Newly deprecated tokens (13):_

  - `breadcrumbs-height`
  - `breadcrumbs-height-compact`
  - `breadcrumbs-top-to-text`
  - `breadcrumbs-top-to-text-compact`
  - `breadcrumbs-bottom-to-text`
  - `breadcrumbs-bottom-to-text-compact`
  - `breadcrumbs-start-edge-to-text`
  - `breadcrumbs-top-to-separator-icon`
  - `breadcrumbs-top-to-separator-icon-compact`
  - `breadcrumbs-top-to-separator-icon-multiline`
  - `breadcrumbs-separator-icon-to-bottom-text-multiline`
  - `breadcrumbs-truncated-menu-to-separator-icon`
  - `breadcrumbs-top-to-truncated-menu-compact`

  _Token values updated (20):_

  - `breadcrumbs-top-to-separator-icon-multiline`
  - `breadcrumbs-top-to-text-multiline`
  - `breadcrumbs-bottom-to-text-multiline`
  - `breadcrumbs-height-multiline`
  - `breadcrumbs-top-to-separator-icon-multiline`
  - `breadcrumbs-top-to-text-multiline`
  - `breadcrumbs-height`
  - `breadcrumbs-height-compact`
  - `breadcrumbs-truncated-menu-to-separator-icon`
  - `breadcrumbs-truncated-menu-to-bottom-text`
  - `breadcrumbs-bottom-to-text`
  - `breadcrumbs-bottom-to-text-compact`
  - `breadcrumbs-separator-icon-to-bottom-text-multiline`
  - `breadcrumbs-start-edge-to-text`
  - `breadcrumbs-top-to-separator-icon`
  - `breadcrumbs-top-to-separator-icon-compact`
  - `breadcrumbs-top-to-text`
  - `breadcrumbs-top-to-text-compact`
  - `breadcrumbs-top-to-truncated-menu`
  - `breadcrumbs-top-to-truncated-menu-compact`

## 13.0.0-beta.36

### Minor Changes

- [#342](https://github.com/adobe/spectrum-tokens/pull/342) [`9da9532`](https://github.com/adobe/spectrum-tokens/commit/9da9532f1915070d289f7cce6f4e562c2565f889) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - Newly defined S2 Icon colors by the Icons team were incorporated into our system. This includes updates to existing colors and new color additions. More details on icon colors can be found [in this document](https://paper.dropbox.com/doc/S2-Icon-colors-May-update--CPQCbAN3uvmfSCYV5UekAgYkAg-BqbGyRAAL87Ehoqm9WrCB) and [this Figma file](https://www.figma.com/design/KRqwJWgLuW4R7HwFUzKWiB/S2-Icon-color?node-id=0%3A1&t=jRZwm9gOH4dyLwL7-1).

  ## Design motivation

  Icons team defined new S2 color tokens needed for their iconography assets.

  ## Token diff

  _Tokens added (78):_

  - `icon-color-blue-background`
  - `icon-color-blue-primary-down`
  - `icon-color-blue-primary-hover`
  - `icon-color-brown-background`
  - `icon-color-brown-primary-default`
  - `icon-color-brown-primary-down`
  - `icon-color-brown-primary-hover`
  - `icon-color-celery-background`
  - `icon-color-celery-primary-default`
  - `icon-color-celery-primary-down`
  - `icon-color-celery-primary-hover`
  - `icon-color-chartreuse-background`
  - `icon-color-chartreuse-primary-default`
  - `icon-color-chartreuse-primary-down`
  - `icon-color-chartreuse-primary-hover`
  - `icon-color-cinnamon-background`
  - `icon-color-cinnamon-primary-default`
  - `icon-color-cinnamon-primary-down`
  - `icon-color-cinnamon-primary-hover`
  - `icon-color-cyan-background`
  - `icon-color-cyan-primary-default`
  - `icon-color-cyan-primary-down`
  - `icon-color-cyan-primary-hover`
  - `icon-color-disabled-primary`
  - `icon-color-emphasized-background`
  - `icon-color-fuchsia-background`
  - `icon-color-fuchsia-primary-default`
  - `icon-color-fuchsia-primary-down`
  - `icon-color-fuchsia-primary-hover`
  - `icon-color-green-background`
  - `icon-color-green-primary-down`
  - `icon-color-green-primary-hover`
  - `icon-color-indigo-background`
  - `icon-color-indigo-primary-default`
  - `icon-color-indigo-primary-down`
  - `icon-color-indigo-primary-hover`
  - `icon-color-informative`
  - `icon-color-inverse-background`
  - `icon-color-magenta-background`
  - `icon-color-magenta-primary-default`
  - `icon-color-magenta-primary-down`
  - `icon-color-magenta-primary-hover`
  - `icon-color-negative`
  - `icon-color-neutral`
  - `icon-color-notice`
  - `icon-color-orange-background`
  - `icon-color-orange-primary-default`
  - `icon-color-orange-primary-down`
  - `icon-color-orange-primary-hover`
  - `icon-color-pink-background`
  - `icon-color-pink-primary-default`
  - `icon-color-pink-primary-down`
  - `icon-color-pink-primary-hover`
  - `icon-color-positive`
  - `icon-color-primary-down`
  - `icon-color-primary-hover`
  - `icon-color-purple-background`
  - `icon-color-purple-primary-default`
  - `icon-color-purple-primary-down`
  - `icon-color-purple-primary-hover`
  - `icon-color-red-background`
  - `icon-color-red-primary-down`
  - `icon-color-red-primary-hover`
  - `icon-color-seafoam-background`
  - `icon-color-seafoam-primary-default`
  - `icon-color-seafoam-primary-down`
  - `icon-color-seafoam-primary-hover`
  - `icon-color-silver-background`
  - `icon-color-silver-primary-default`
  - `icon-color-silver-primary-down`
  - `icon-color-silver-primary-hover`
  - `icon-color-turquoise-background`
  - `icon-color-turquoise-primary-default`
  - `icon-color-turquoise-primary-down`
  - `icon-color-turquoise-primary-hover`
  - `icon-color-yellow-background`
  - `icon-color-yellow-primary-down`
  - `icon-color-yellow-primary-hover`

## 13.0.0-beta.35

### Minor Changes

- [#337](https://github.com/adobe/spectrum-tokens/pull/337) [`df2ab7e`](https://github.com/adobe/spectrum-tokens/commit/df2ab7ed77d385593342a3ced7bfded94bd8af8e) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - Updated illustrated message and drop zone tokens

  ## Design Motivation

  - The previous tokens had the incorrect types. By fixing the type, they can reference the updated tokens that are replacing them.
  - Illustrated message now has three sizes (S, M, L) in Spectrum 2 to cover a wider range of use cases
  - Component font size tokens now specify font in the token name

  ## Token Diff

  _Tokens added (12):_

  - `drop-zone-body-font-size`
  - `drop-zone-cjk-title-font-size`
  - `drop-zone-title-font-size`
  - `illustrated-message-large-body-font-size`
  - `illustrated-message-large-cjk-title-font-size`
  - `illustrated-message-large-title-font-size`
  - `illustrated-message-medium-body-font-size`
  - `illustrated-message-medium-cjk-title-font-size`
  - `illustrated-message-medium-title-font-size`
  - `illustrated-message-small-body-font-size`
  - `illustrated-message-small-cjk-title-font-size`
  - `illustrated-message-small-title-font-size`

  _Newly deprecated tokens (6):_

  - `drop-zone-body-size`
  - `drop-zone-cjk-title-size`
  - `drop-zone-title-size`
  - `illustrated-message-body-size`
  - `illustrated-message-cjk-title-size`
  - `illustrated-message-title-size`

  _Token value updated (1):_

  - `drop-zone-border-dash-gap`

## 13.0.0-beta.34

### Minor Changes

- [#334](https://github.com/adobe/spectrum-tokens/pull/334) [`4d28593`](https://github.com/adobe/spectrum-tokens/commit/4d28593c9d34414d72d78a1cc6c480d9ffdf82ce) Thanks [@nabuhasan](https://github.com/nabuhasan)! - S2 Popover tokens update

  ## Token Diff

  _Tokens added (3):_

  - `popover-border-color`
  - `popover-border-opacity`
  - `popover-edge-to-content-area`

  _Newly deprecated token (1):_

  - `popover-top-to-content-area`

## 13.0.0-beta.33

### Minor Changes

- [#331](https://github.com/adobe/spectrum-tokens/pull/331) [`0bbfedb`](https://github.com/adobe/spectrum-tokens/commit/0bbfedb9dbb63fdd5b20e91f65b3f958a833313b) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - S2 Menu token updates

  ## Token Diff

  _Tokens added (23):_

  - `link-out-icon-size-100`
  - `link-out-icon-size-200`
  - `link-out-icon-size-75`
  - `menu-item-background-color-default`
  - `menu-item-background-color-disabled`
  - `menu-item-background-color-down`
  - `menu-item-background-color-hover`
  - `menu-item-background-color-keyboard-focus`
  - `menu-item-background-opacity`
  - `menu-item-label-to-description`
  - `menu-item-label-to-description-extra-large`
  - `menu-item-label-to-description-large`
  - `menu-item-label-to-description-medium`
  - `menu-item-label-to-description-small`
  - `menu-item-top-to-thumbnail-extra-large`
  - `menu-item-top-to-thumbnail-large`
  - `menu-item-top-to-thumbnail-medium`
  - `menu-item-top-to-thumbnail-small`
  - `menu-section-header-to-description-extra-large`
  - `menu-section-header-to-description-large`
  - `menu-section-header-to-description-medium`
  - `menu-section-header-to-description-small`
  - `text-to-visual-400`

  _Token values updated (1):_

  - `menu-item-section-divider-height`

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
