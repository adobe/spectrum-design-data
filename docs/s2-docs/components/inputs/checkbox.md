---
title: Checkbox
source_url: /web/rsp/components/checkbox
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/checkbox
swc_exists: false
---

# Checkbox

## Anatomy

checkbox control label

## Component options

isError Checkboxes can be marked as having an error to show that a selection needs to be made in order to move forward, or that a selection that was made is invalid. For example, in a form that requires a user to acknowledge legal terms before proceeding, the checkbox would show an unchecked error to communicate that it needs to be selected. isDisabled A checkbox in a disabled state shows that a selection exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that an action may become available later. isEmphasized By default, checkboxes are not emphasized (gray). This version is optimal for when the checkbox is not the core part of an interface, such as in application panels, where all visual components are monochrome in order to direct focus to the content. The emphasized (blue) version provides a visual prominence that is optimal for forms, settings, lists or grids of assets, and other situations where a checkbox need to be noticed. size Checkboxes come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. isIndeterminate Checkboxes can be in an indeterminate state when they represent both selected and not selected values. isSelected Checkboxes can be selected or not selected. label Checkboxes should always have a label. When the label is not defined, a checkbox becomes standalone. Standalone checkboxes are only used when their connection to other components is clear and they give sufficient context — for example, in application panels.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedSupportedDraggedNot supportedErrorSupported

## Behaviors

### Keyboard focus

A checkbox can be navigated using a keyboard. The keyboard focus state takes the checkbox's visual hover state and adds a blue ring to the checkbox in focus.

### Text overflow

When the label is too long for the horizontal space available, it wraps to form another line.

## Usage guidelines

### Emphasized or not?

Emphasized checkboxes are optimal for forms, settings, etc. where the checkboxes need to be noticed, or to bring attention to selected items such as cards or table rows. Not emphasized checkboxes are optimal for application panels where all the visual components are monochrome in order to direct focus to the canvas.

### When to use a standalone checkbox

Standalone checkboxes should be used in situations where the context is clear without an associated text label. An example of this would be when a checkbox is connected to other controls inside of a panel.

### Checkbox vs. radio button

Checkboxes and radio buttons are not interchangeable. A set of checkboxes should be used to select as many options as desired (or none). A set of radio buttons should be used to select only a single option from a list of mutually exclusive options.

### Checkbox vs. switch

Use checkboxes to show selection, such as choosing multiple table rows. Use switches to show activation, like turning a setting on or off. Unlike switches, checkboxes can display an error state.

### Label groups of related checkboxes

Sets of checkboxes should always have a clear label that describes what the list of options represents and guides users what to do. This is important for accessibility, since a screen reader will read the label before each option.

### Representing mixed values

When a checkbox represents multiple values that are not identical, the checkbox should appear in the indeterminate state. Any subsequent click or tap should select the checkbox, and update all values to be selected. Another click or tap after that should deselect the checkbox, and update all values to be not selected.

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the checkbox is mirrored. The checkmark is placed on the right side of the text.

## Accessibility

### Keyboard interactions

Key Interaction TabTabbing into a group of checkboxes places the focus on the first checkbox (only one checkbox receives the keyboard focus at a time).Shift + TabMoves focus to the previous item or group of items.Space or EnterToggles the checkbox between selected and not selected. If the checkbox is partially selected initially, the checkbox becomes selected first (subsequent toggles alternate normally between selected and not selected).

### Cursor guidelines

Cursor Description PointerUse the pointer cursor for all interactive components in every state.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as the checkbox control—must provide a text alternative that communicates the control’s purpose. All controls, especially icon‑only controls, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAACheckboxes should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role should be utilized.Orientation 1.3.4 AACheckbox groups are available in both vertical and horizontal orientations.Use of color 1.4.1 AColor is not used as a means to convey information or distinguish elements, indicate an action, or prompt a response. Color is always paired with text or icons, and is only used to enhance the meaning of the text.Text contrast minimums 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Resize text 1.4.4 AACheckboxes should be built in such a way that they can be resized without assistive technology up to 200%.Visual presentation 1.4.8 AAACheckbox labels can wrap to multiple lines, so the 80-character (40 CJK) and no-justified-text guidance applies the same way it does for the group.Non-text contrast 1.4.11 AAThe checkbox control and its various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size when the label is wrapped. 2. Operable Requirement Criterion Level Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical feactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
