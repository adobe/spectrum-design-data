---
title: Radio button
source_url: /web/rsp/components/radio-button
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/radio-button
swc_exists: false
---

# Radio button

## Anatomy

radio button control label

## Component options

label Radio button should always have a label for accessibility and clear comprehension. When the label is not defined, a radio button becomes standalone. Standalone radio buttons should only be used when their connection to other components is clear and they give sufficient context — for example, in application panels. If a visible label isn't specified, an aria-label must be provided to the radio button for accessibility. If the field is labeled by a separate element, an aria-labelledby prop must be provided using the id of the labeling element instead. isEmphasized By default, radio buttons are not emphasized. This version is optimal for when the radio button is not the core part of an interface, such as in application panels, where all visual components are monochrome in order to direct focus to the content. The emphasized version provides a visual prominence that is optimal for forms, settings, lists or grids of assets, and other situations where a radio button needs to be noticed. isSelected Radio button can either be selected or not selected. They cannot be in an indeterminate state (unlike checkboxes). size Radio buttons come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedSupportedDraggedNot supportedErrorNot supported

## Behaviors

### Keyboard focus

A radio button can be navigated using a keyboard. The keyboard focus state takes the radio button's visual hover state and adds a blue ring to the radio button in focus.

### Text overflow

When the button text is too long for the horizontal space available, it wraps to form another line.

## Usage guidelines

### Radio button, checkbox or switch?

Radio buttons are best when only one option can be selected at a time from a set (for example choosing one preference or mode). Switches are best for communicating activation (e.g., turning a setting on or off). Checkboxes are best for communicating selection (e.g., selecting multiple items from a list).

### When to use an emphasized radio button?

Emphasized radio buttons are optimal for forms, settings, and other scenarios where the radio buttons need to be noticed. Default radio buttons are optimal for application panels where all the visual components are monochrome in order to direct focus to the canvas.

### No partial state

Radio buttons can only be on or off. Indeterminate radio buttons don't exist in accessibility APIs, so it's not possible to make an indeterminate radio button accessible. If you need to show a partial state, use a checkbox instead of a radio button. When a parent radio button represents a group of radio buttons, it should be turned off unless all of the radio buttons are on (turning the parent radio button on turns all of the radio buttons on).
