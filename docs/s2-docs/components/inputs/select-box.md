---
title: Select box
source_url: /web/rsp/components/select-box
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/select-box
swc_exists: false
---

# Select box

## Anatomy

select box illustration (optional) label (required) and body (optional) checkbox

## Component options

isSelected, multiple, and showCheckbox Select boxes allow users to choose options in a workflow. Both single-select and multi-select versions use checkboxes to show selection. Multi-select boxes display unchecked checkboxes by default to signal that multiple choices are allowed. Single-select boxes only show an unchecked checkbox on hover. If showCheckbox is false, selection is only shown using the dark border. isDisabled A select box in a disabled state shows that the items within the group exist, but are not available in that circumstance. This state can be used to maintain layout continuity and to communicate that an option may become available later. Individual boxes may be disabled or the entire group may be disabled. hideIllustration Illustrations are optional but recommended and included by default. label A label is required in select boxes. It acts as the title of the select box and explains its action or purpose.. Ideally, the label should be kept concise, even in the horizontal orientation. body Body is optional in select boxes. If no value is entered for the body, then it will not appear in the component. Body is usually reserved for the horizontal version of select boxes. orientation A select box is vertical by default, which works best when metadata is limited to a short title, with or without an illustration. The horizontal orientation is recommended when the select box includes longer-form metadata.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedSupportedDraggedNot supportedErrorNot supported

## Behaviors

### Minimum and maximum size

Minimum and maximum sizing ensures that the component remains clear, usable, and visually consistent, even in flexible or responsive layouts.

### Consistent sizing

All select boxes should be the same size as one another. Keep metadata concise, and make the size of the box large enough to accommodate longer text when translated to other languages.

### Text overflow

When the title of the select box is too long for the available horizontal space, it wraps to another line. Wrapped text should not affect the size of an individual select box. Each box in a group should have enough space to allow for longer, localized text to fit as necessary.

### Selection

Clicking a select box does not immediately move to the next step in the sequence. After making a selection, the user must initiate the next step by choosing a button or similar component outside the select box group.

### Keyboard focus

A select box group can be navigated using a keyboard. The keyboard focus state takes the button's visual hover state and adds a blue ring to the button in focus.

## Usage guidelines

### Use illustrations only when they have a clear meaning

Illustrations should be used when they help clarify the content. If the items are too complex to represent visually, it may be better to omit them. For consistency, if one select box includes an illustration, all select boxes in the group should include one.

### Keep select box groups to 9 items or less

Select box groups work best with 3 to 9 items. If your experience needs more than 9 items, consider using a dropdown, checkboxes, or radio button group instead.

### Don't use select boxes as actions

Select boxes are used to choose an item from a group. If clicking an item is meant to immediately trigger an action, use an action group instead.

### Use consistent sizing

All select boxes in a group should be the same size to maintain visual consistency and usability.

### Don't use radio buttons in select boxes

Select boxes use a checkbox to indicate both single- and multi-selection. Don't use radio buttons for single-selection.

### Checkbox vs. highlight selection

Some cases may make more sense for the user to select one or a few options in a group of select boxes, but if the use case doesn't make sense to be checking a selection, showCheckbox can be false and the highlight style can be used instead. There is no visual differentiation between single- and multi-select behaviors when checkboxes are not present.
