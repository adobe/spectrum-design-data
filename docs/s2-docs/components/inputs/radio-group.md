---
title: Radio group
source_url: /web/rsp/components/radio-group
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/radio-group
swc_exists: false
---

# Radio group

## Anatomy

radio group field label radio button area help text (optional)

## Component options

description Radio groups should use help text for error messaging and descriptions. Descriptions are valuable for giving context behind why a selection is required, or for clarifying the options. errorMessage Radio groups can be marked as having an error to show that a selection needs to be made in order to move forward, or that a selection that was made is invalid. The error is indicated with negative help text, along with an icon. isDisabled A radio group in a disabled state shows that a selection exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that an action may become available later. The field label, radio buttons, and help text are all displayed in a disabled state when the radio group is disabled. isError Radio groups can be marked as having an error to show that a selection needs to be made in order to move forward, or that a selection that was made is invalid. The error is indicated with negative help text, along with an icon. isRequired and necessityIndicator Radio groups can be marked as optional or required, depending on the situation. For required radio groups, there are two styling options: a "(required)" label or an asterisk. If you use an asterisk, be sure to include help text to explain what the asterisk means. Optional radio groups are either denoted with text added to the end of the label — "(optional)" — or have no indication at all. The asterisk used in this component is an icon that has specific spacing from the label text — not part of the label text itself. isEmphasized By default, radio buttons are not emphasized (gray). This option is best for when the radio button is not the core part of an interface, such as in application panels, where all visual components are monochrome in order to direct focus to the content. The emphasized (blue) version provides a visual prominence that is best for forms, settings, lists or grids of assets, and other situations where a radio button needs to be noticed. size Radio groups come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. orientation Radio groups can be either horizontal or vertical. By default, radio groups are vertical. Use a horizontal radio group when vertical space is limited. labelPosition Labels can be placed either on top or on the side. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited. label Radio groups should always have a label. In rare cases where context is sufficient and an accessibility expert has reviewed the design, the label could be undefined. These radio groups without a visible label should still include an aria-label in HTML (depending on the context, "aria-label" or "aria-labelledby").

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusNot supportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorSupported

## Behaviors

### Keyboard focus

A radio button can be navigated using a keyboard. The keyboard focus state takes the radio button's visual hover state and adds a blue ring to the radio button in focus.

### Text overflow

When the label is too long for the horizontal space available, it wraps to form another line.

### Mixed value

When a radio button group presents multiple values that are not identical, the group should not show a selection. Any subsequent selection should update all values.

## Usage guidelines

### When to use an emphasized radio group?

Emphasized radio group is optimal for forms, settings, and other scenarios where the radio group need to be noticed. Default radio group is optimal for application panels where all the visual components are monochrome in order to direct focus to the canvas.

### Use radio buttons for mutually exclusive options

Radio buttons and checkboxes are not interchangeable. Radio buttons are best used for selecting a single option from a list of mutually exclusive options. Checkboxes are best used for selecting multiple options at once (or no options).

### Always label radio groups

Radio groups should always have a label that clearly describes what the list of options represents. This is important for accessibility, since a screen reader will read the label before each option. Make sure to include a label, and don't assume that the options are self-explanatory without one. Write the label in sentence case.

### Radio group, switch, or checkbox?

Radio buttons are best when only one option can be selected at a time from a set (e.g., choosing one preference or mode). Switches are best for communicating activation (e.g., turning a setting on or off). Checkboxes are best for communicating selection (e.g., selecting multiple items from a list).

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the radio group (and its components) is mirrored. The radio buttons and icons are placed on the right side of the text, and text is aligned to the right.

## Accessibility

### Keyboard interactions

Key Interaction TabMoves focus onto or off of the button.Space or EnterExecutes the button action. The focus remains on the button except if the button opens or closes the current container. In this case, the focus moves to the target or back to the caller.

### Cursor guidelines

Cursor Usage PointerUse the pointer cursor for all interactive components.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as icons used in buttons—must provide a text alternative that communicates the button’s purpose. All buttons, especially icon‑only buttons, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAButtons should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role of buttons should be utilized.Use of color 1.4.1 AColor is never used as the sole way to convey meaning in buttons. While negative buttons do use red to reinforce their purpose, every button also includes a clear text label that communicates the action it performs.Text contrast minimums 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Resize text 1.4.4 AAButtons should be built in such a way that they can be resized without assistive technology up to 200%.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable Requirement Criterion Level Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
