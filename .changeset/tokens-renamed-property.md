---
"@adobe/spectrum-tokens": minor
---

feat(tokens): add renamed property for tracking token replacements

Added optional `renamed` property to base token schema for tracking 1:1 token replacements. This property specifies the new token name when a deprecated token has been renamed.

**67 deprecated tokens** were migrated to include the `renamed` property, providing clear migration paths for consumers.

This is a non-breaking change that prepares for the full lifecycle metadata framework described in [RFC #623](https://github.com/adobe/spectrum-design-data/discussions/623).

## Token Diff

## Tokens Changed (67)

**Original Branch:** `main`
**New Branch:** `tokens/feat/renamed`

<details open><summary><strong>Updated Properties (67)</strong></summary>

All tokens below had the `renamed` property added to indicate their replacement token name:

- `drop-shadow-color` → `drop-shadow-color-100`
- `color-loupe-drop-shadow-color` → `drop-shadow-elevated-color`
- `color-handle-drop-shadow-color` → `drop-shadow-color`
- `floating-action-button-shadow-color` → `floating-action-button-drop-shadow-color`
- `field-width` → `field-default-width-medium`
- `field-width-small` → `field-default-width-small`
- `field-width-medium` → `field-default-width-medium`
- `field-width-large` → `field-default-width-large`
- `field-width-extra-large` → `field-default-width-extra-large`
- `help-text-top-to-workflow-icon-small.sets.desktop` → `component-top-to-workflow-icon-75`
- `help-text-top-to-workflow-icon-small.sets.mobile` → `component-top-to-workflow-icon-75`
- `help-text-top-to-workflow-icon-medium.sets.desktop` → `component-top-to-workflow-icon-100`
- `help-text-top-to-workflow-icon-medium.sets.mobile` → `component-top-to-workflow-icon-100`
- `help-text-top-to-workflow-icon-large.sets.desktop` → `component-top-to-workflow-icon-200`
- `help-text-top-to-workflow-icon-large.sets.mobile` → `component-top-to-workflow-icon-200`
- `help-text-top-to-workflow-icon-extra-large.sets.desktop` → `component-top-to-workflow-icon-300`
- `help-text-top-to-workflow-icon-extra-large.sets.mobile` → `component-top-to-workflow-icon-300`
- `meter-default-width` → `meter-width`
- `popover-top-to-content-area` → `popover-edge-to-content-area`
- `picker-end-edge-to-disclousure-icon-quiet` → `picker-end-edge-to-disclosure-icon-quiet`
- `combo-box-visual-to-field-button-small` → `combo-box-visual-to-field-button`
- `combo-box-visual-to-field-button-medium` → `combo-box-visual-to-field-button`
- `combo-box-visual-to-field-button-large` → `combo-box-visual-to-field-button`
- `combo-box-visual-to-field-button-extra-large` → `combo-box-visual-to-field-button`
- `combo-box-visual-to-field-button-quiet` → `combo-box-visual-to-field-button`
- `alert-dialog-title-size` → `alert-dialog-title-font-size`
- `alert-dialog-description-size` → `alert-dialog-description-font-size`
- `opacity-checkerboard-square-size` → `opacity-checkerboard-square-size-medium`
- `breadcrumbs-start-edge-to-text` → `breadcrumbs-start-edge-to-text-large`
- `breadcrumbs-top-to-separator-icon` → `breadcrumbs-top-to-separator-large`
- `breadcrumbs-top-to-separator-icon-compact` → `breadcrumbs-top-to-separator-medium`
- `alert-banner-to-top-workflow-icon` → `alert-banner-top-to-workflow-icon`
- `alert-banner-to-top-text` → `alert-banner-top-to-text`
- `alert-banner-to-bottom-text` → `alert-banner-bottom-to-text`
- `illustrated-message-title-size` → `illustrated-message-medium-title-font-size`
- `illustrated-message-cjk-title-size` → `illustrated-message-medium-cjk-title-font-size`
- `illustrated-message-body-size` → `illustrated-message-medium-body-font-size`
- `card-minimum-width` → `card-minimum-width-default`
- `drop-zone-title-size` → `drop-zone-title-font-size`
- `drop-zone-cjk-title-size` → `drop-zone-cjk-title-font-size`
- `drop-zone-body-size` → `drop-zone-body-font-size`
- `coach-mark-title-size` → `coach-mark-title-font-size`
- `coach-mark-body-size` → `coach-mark-body-font-size`
- `coach-mark-pagination-body-size` → `coach-mark-pagination-body-font-size`
- `accordion-small-top-to-text-spacious.sets.desktop` → `accordion-top-to-text-spacious-small`
- `accordion-small-top-to-text-spacious.sets.mobile` → `accordion-top-to-text-spacious-small`
- `table-row-height-small-regular` → `table-row-height-small`
- `table-row-height-medium-regular` → `table-row-height-medium`
- `table-row-height-large-regular` → `table-row-height-large`
- `table-row-height-extra-large-regular` → `table-row-height-extra-large`
- `table-row-top-to-text-small-regular` → `table-row-top-to-text-small`
- `table-row-top-to-text-medium-regular` → `table-row-top-to-text-medium`
- `table-row-top-to-text-large-regular` → `table-row-top-to-text-large`
- `table-row-top-to-text-extra-large-regular` → `table-row-top-to-text-extra-large`
- `table-row-bottom-to-text-small-regular` → `table-row-bottom-to-text-small`
- `table-row-bottom-to-text-medium-regular` → `table-row-bottom-to-text-medium`
- `table-row-bottom-to-text-large-regular` → `table-row-bottom-to-text-large`
- `table-row-bottom-to-text-extra-large-regular` → `table-row-bottom-to-text-extra-large`
- `table-row-checkbox-to-top-small-regular` → `table-row-checkbox-to-top-small`
- `table-row-checkbox-to-top-medium-regular` → `table-row-checkbox-to-top-medium`
- `table-row-checkbox-to-top-large-regular` → `table-row-checkbox-to-top-large`
- `table-row-checkbox-to-top-extra-large-regular` → `table-row-checkbox-to-top-extra-large`
- `table-thumbnail-to-top-minimum-small-regular` → `table-thumbnail-to-top-minimum-small`
- `table-thumbnail-to-top-minimum-medium-regular` → `table-thumbnail-to-top-minimum-medium`
- `table-thumbnail-to-top-minimum-large-regular` → `table-thumbnail-to-top-minimum-large`
- `table-thumbnail-to-top-minimum-extra-large-regular` → `table-thumbnail-to-top-minimum-extra-large`
- `tree-view-item-to-item` → `tree-view-item-to-item-default`

</details>
